import {
  AudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";

import SerialTaskQueue from "./core/SerialTaskQueue.js";
import type { GuildMusicTrack } from "./GuildMusicTrack.js";
import { getPlayableInput } from "./playback/getPlayableInput.js";
import type { MusicEvents } from "./types/MusicEvents.js";
import { TypedEventEmitter } from "./types/TypedEventEmitter.js";

type AdapterCreator = Parameters<typeof joinVoiceChannel>[0]["adapterCreator"];

class GuildMusicSession extends TypedEventEmitter<MusicEvents> {
  connection: VoiceConnection | null = null;
  readonly player: AudioPlayer;

  voiceChannelId: string | null = null;

  current: GuildMusicTrack | null = null;
  queue: GuildMusicTrack[] = [];
  history: GuildMusicTrack[] = [];
  loop = false;
  paused = false;

  private readonly tasks = new SerialTaskQueue();
  private currentPlayback: {
    kill(signal?: NodeJS.Signals | number): void;
  } | null = null;
  private destroyed = false;
  private suppressNextIdle = false;
  private skipRequested = false;

  private currentStartedAt: number | null = null;
  private pushCurrentToHistoryOnIdle = true;

  constructor(readonly guildId: string) {
    super();

    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    this.player.on("error", (error) => {
      console.error(`[Music:${this.guildId}] Player error:`, error);

      void this.tasks.run(async () => {
        const failedTrack = this.current;

        this.cleanupPlayback(true);

        if (failedTrack) {
          this.emit("playbackError", this, error);
          this.emit("trackEnd", this, failedTrack);
        }

        await this.playNextInternal();
        this.emitState();
      });
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      void this.tasks.run(async () => {
        if (this.destroyed) return;

        if (this.suppressNextIdle) {
          this.suppressNextIdle = false;
          this.emitState();
          return;
        }

        this.cleanupPlayback(false);

        const endedTrack = this.current;

        if (this.current && this.pushCurrentToHistoryOnIdle) {
          this.history.push(this.current);
        }

        this.pushCurrentToHistoryOnIdle = true;

        if (endedTrack) {
          this.emit("trackEnd", this, endedTrack);
        }

        if (this.skipRequested) {
          this.skipRequested = false;
          this.current = null;
          await this.playNextInternal();
          this.emitState();
          return;
        }

        if (this.loop && this.current) {
          const loopingTrack = this.current;
          this.current = null;
          await this.playTrackInternal(loopingTrack);
          this.emitState();
          return;
        }

        this.current = null;
        await this.playNextInternal();
        this.emitState();
      });

      this.paused = false;
    });

    this.player.on(AudioPlayerStatus.Paused, () => {
      this.paused = true;
      this.emit("pause", this);
      this.emitState();
    });

    this.player.on(AudioPlayerStatus.Playing, () => {
      const wasPaused = this.paused;
      this.paused = false;

      if (wasPaused) {
        this.emit("resume", this);
      }

      this.emitState();
    });
  }

  isPlaying(): boolean {
    return this.current !== null;
  }

  setLoop(enabled: boolean): void {
    if (this.loop === enabled) return;

    this.loop = enabled;
    this.emit("loopChange", this, enabled);
    this.emitState();
  }

  async join(
    voiceChannelId: string,
    guildId: string,
    adapterCreator: AdapterCreator,
  ): Promise<void> {
    await this.tasks.run(async () => {
      if (this.destroyed) {
        throw new Error("Session is destroyed.");
      }

      if (this.connection && this.voiceChannelId === voiceChannelId) {
        return;
      }

      this.connection?.destroy();

      const connection = joinVoiceChannel({
        channelId: voiceChannelId,
        guildId,
        adapterCreator,
        selfDeaf: true,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 60_000);

      connection.subscribe(this.player);

      this.connection = connection;
      this.voiceChannelId = voiceChannelId;

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          await this.tasks.run(async () => {
            if (this.destroyed) return;

            this.connection?.destroy();
            this.connection = null;
            this.voiceChannelId = null;

            this.cleanupPlayback(true);

            this.emit("connectionLost", this);
            this.emitState();
          });
        }
      });

      this.emitState();
    });
  }

  async startOrQueue(tracks: GuildMusicTrack[]): Promise<"started" | "queued"> {
    return this.tasks.run(async () => {
      if (tracks.length === 0) {
        throw new Error("No tracks provided.");
      }

      if (this.current) {
        this.queue.push(...tracks);
        this.emit("queueUpdate", this);
        this.emitState();
        return "queued";
      }

      const first = tracks[0]!;
      const rest = tracks.slice(1);

      await this.playTrackInternal(first);

      if (rest.length > 0) {
        this.queue.push(...rest);
        this.emit("queueUpdate", this);
      }

      this.emitState();
      return "started";
    });
  }

  async pause(): Promise<boolean> {
    return this.tasks.run(async () => {
      if (!this.current) return false;
      return this.player.pause(true);
    });
  }

  async resume(): Promise<boolean> {
    return this.tasks.run(async () => {
      if (!this.current) return false;
      return this.player.unpause();
    });
  }

  async stop(): Promise<void> {
    await this.tasks.run(async () => {
      this.queue = [];
      this.emit("queueUpdate", this);

      this.suppressNextIdle = true;
      this.player.stop(true);
      this.cleanupPlayback(true);

      this.emit("stop", this);
      this.emitState();
    });
  }

  async skip(): Promise<GuildMusicTrack | null> {
    return this.tasks.run(async () => {
      if (!this.current) {
        return null;
      }

      const upcoming = this.queue[0] ?? null;

      this.skipRequested = true;
      this.player.stop(true);
      this.cleanupPlayback(false);

      return upcoming;
    });
  }

  async previous(): Promise<GuildMusicTrack | null> {
    return this.tasks.run(async () => {
      if (!this.current) {
        return null;
      }

      const elapsed =
        this.currentStartedAt === null
          ? Number.POSITIVE_INFINITY
          : Date.now() - this.currentStartedAt;

      if (elapsed < 5_000 && this.history.length > 0) {
        const previous = this.history.pop()!;

        this.queue.unshift(this.current);
        this.queue.unshift(previous);

        this.emit("queueUpdate", this);

        this.pushCurrentToHistoryOnIdle = false;
        this.skipRequested = true;
        this.player.stop(true);
        this.cleanupPlayback(true);

        return previous;
      }

      const restarted = this.current;

      this.queue.unshift(restarted);
      this.emit("queueUpdate", this);

      this.pushCurrentToHistoryOnIdle = false;
      this.skipRequested = true;
      this.player.stop(true);
      this.cleanupPlayback(false);

      return restarted;
    });
  }

  async leave(): Promise<void> {
    await this.tasks.run(async () => {
      this.destroyed = true;
      this.queue = [];
      this.history = [];

      this.emit("queueUpdate", this);

      this.suppressNextIdle = true;
      this.player.stop(true);
      this.cleanupPlayback(true);

      this.connection?.destroy();
      this.connection = null;
      this.voiceChannelId = null;

      this.emit("sessionDestroyed", this);
      this.emitState();
      this.removeAllListeners();
    });
  }

  async selectRelative(offset: number): Promise<GuildMusicTrack | null> {
    return this.tasks.run(async () => {
      if (!this.current) return null;

      const timeline = [...this.history, this.current, ...this.queue];
      const currentIndex = this.history.length;
      const targetIndex = currentIndex + offset;

      const target = timeline[targetIndex];
      if (!target) return null;

      if (target === this.current) return this.current;

      this.history = timeline.slice(0, targetIndex);
      this.current = target;
      this.queue = timeline.slice(targetIndex + 1);

      this.emit("queueUpdate", this);

      this.pushCurrentToHistoryOnIdle = false;
      this.skipRequested = true;
      this.player.stop(true);
      this.cleanupPlayback(false);

      return target;
    });
  }

  private emitState(): void {
    this.emit("stateChange", this);
  }

  private async playNextInternal(): Promise<void> {
    const next = this.queue.shift();

    if (!next) {
      this.emit("queueUpdate", this);
      return;
    }

    this.emit("queueUpdate", this);
    await this.playTrackInternal(next);
  }

  private async playTrackInternal(track: GuildMusicTrack): Promise<void> {
    if (!this.connection) {
      throw new Error("No voice connection.");
    }

    this.cleanupPlayback(false);

    const playable = getPlayableInput(track);
    this.currentPlayback = playable;
    this.current = track;
    this.currentStartedAt = Date.now();
    this.paused = false;

    const resource = createAudioResource(playable.stream, {
      inputType: StreamType.Raw,
    });

    this.player.play(resource);

    this.emit("trackStart", this, track);
  }

  private cleanupPlayback(clearCurrent: boolean): void {
    try {
      this.currentPlayback?.kill("SIGKILL");
    } catch {
      // ignore
    }

    this.currentPlayback = null;

    if (clearCurrent) {
      this.current = null;
      this.currentStartedAt = null;
    }
  }
}

export default GuildMusicSession;
