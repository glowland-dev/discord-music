import GuildMusicManager from "./GuildMusicManager.js";
import type { ResolvedTracks } from "./resolvers/resolveTrack.js";
import { resolveTrack } from "./resolvers/resolveTrack.js";
import type { GuildMusicTrack } from "./GuildMusicTrack.js";
import type GuildMusicSession from "./GuildMusicSession.js";
import type { PlayRequest } from "./types/PlayRequest.js";

export type PlayResult =
  | { ok: false; code: "NOT_IN_VOICE" }
  | { ok: false; code: "JOIN_FAILED" }
  | { ok: false; code: "RESOLVE_FAILED" }
  | { ok: false; code: "NOT_PLAYABLE" }
  | { ok: false; code: "QUEUE_FAILED" }
  | {
      ok: true;
      code: "QUEUED";
      resolvedKind: "single" | "playlist";
      firstTrack: GuildMusicTrack;
      tracks: GuildMusicTrack[];
    }
  | {
      ok: true;
      code: "STARTED";
      resolvedKind: "single" | "playlist";
      firstTrack: GuildMusicTrack;
      tracks: GuildMusicTrack[];
    };

export type StopResult =
  | { ok: false; code: "NOT_PLAYING" }
  | { ok: true; code: "STOPPED" };

export type PauseResult =
  | { ok: false; code: "NOT_PLAYING" }
  | { ok: false; code: "ALREADY_PAUSED" }
  | { ok: true; code: "PAUSED" };

export type ResumeResult =
  | { ok: false; code: "NOT_PLAYING" }
  | { ok: false; code: "NOT_PAUSED" }
  | { ok: true; code: "RESUMED" };

export type LeaveResult =
  | { ok: false; code: "NOT_CONNECTED" }
  | { ok: true; code: "LEFT" };

export type ToggleLoopResult =
  | { ok: true; code: "LOOP_ENABLED" }
  | { ok: true; code: "LOOP_DISABLED" };

export type PreviousResult =
  | { ok: false; code: "NO_HISTORY" }
  | { ok: false; code: "NOT_PLAYING" }
  | { ok: true; code: "PREVIOUS"; track: GuildMusicTrack };

export type NextResult =
  | { ok: false; code: "NOT_PLAYING" }
  | { ok: false; code: "NO_NEXT_TRACK" }
  | { ok: true; code: "NEXT"; track: GuildMusicTrack };

class GuildMusicController {
  constructor(private readonly manager: GuildMusicManager) {}

  get(guildId: string): GuildMusicSession {
    return this.manager.get(guildId);
  }

  find(guildId: string): GuildMusicSession | undefined {
    return this.manager.find(guildId);
  }

  async play(request: PlayRequest): Promise<PlayResult> {
    const query = request.query.trim();

    if (!request.voiceChannelId) {
      return { ok: false, code: "NOT_IN_VOICE" };
    }

    const session = this.manager.get(request.guildId);

    try {
      await session.join(
        request.voiceChannelId,
        request.guildId,
        request.voiceAdapterCreator as Parameters<GuildMusicSession["join"]>[2],
      );
    } catch (error) {
      console.error(`[Music:${request.guildId}] Join failed:`, error);
      return { ok: false, code: "JOIN_FAILED" };
    }

    let resolved: ResolvedTracks;
    try {
      resolved = await resolveTrack(query, request.requestedById);
    } catch (error) {
      console.error(`[Music:${request.guildId}] Resolve failed:`, error);
      return { ok: false, code: "RESOLVE_FAILED" };
    }

    const firstTrack = resolved.tracks[0];
    if (!firstTrack?.url) {
      return { ok: false, code: "NOT_PLAYABLE" };
    }

    try {
      const status = await session.startOrQueue(resolved.tracks);

      return {
        ok: true,
        code: status === "started" ? "STARTED" : "QUEUED",
        resolvedKind: resolved.kind,
        firstTrack,
        tracks: resolved.tracks,
      };
    } catch (error) {
      console.error(`[Music:${request.guildId}] Queue failed:`, error);
      return { ok: false, code: "QUEUE_FAILED" };
    }
  }

  async stop(guildId: string): Promise<StopResult> {
    const session = this.manager.find(guildId);

    if (!session || (!session.current && session.queue.length === 0)) {
      return { ok: false, code: "NOT_PLAYING" };
    }

    await session.stop();
    return { ok: true, code: "STOPPED" };
  }

  async pause(guildId: string): Promise<PauseResult> {
    const session = this.manager.find(guildId);

    if (!session || !session.current) {
      return { ok: false, code: "NOT_PLAYING" };
    }

    const paused = await session.pause();

    if (!paused) {
      return { ok: false, code: "ALREADY_PAUSED" };
    }

    return { ok: true, code: "PAUSED" };
  }

  async resume(guildId: string): Promise<ResumeResult> {
    const session = this.manager.find(guildId);

    if (!session || !session.current) {
      return { ok: false, code: "NOT_PLAYING" };
    }

    const resumed = await session.resume();

    if (!resumed) {
      return { ok: false, code: "NOT_PAUSED" };
    }

    return { ok: true, code: "RESUMED" };
  }

  async leave(guildId: string): Promise<LeaveResult> {
    const session = this.manager.find(guildId);

    if (!session?.connection) {
      return { ok: false, code: "NOT_CONNECTED" };
    }

    await this.manager.delete(guildId);
    return { ok: true, code: "LEFT" };
  }

  toggleLoop(guildId: string): ToggleLoopResult {
    const session = this.manager.get(guildId);
    const enabled = !session.loop;

    session.setLoop(enabled);

    return enabled
      ? { ok: true, code: "LOOP_ENABLED" }
      : { ok: true, code: "LOOP_DISABLED" };
  }

  async previous(guildId: string): Promise<PreviousResult> {
    const session = this.manager.find(guildId);

    if (!session || !session.current) {
      return { ok: false, code: "NOT_PLAYING" };
    }

    const previous = await session.previous();

    if (!previous) {
      return { ok: false, code: "NO_HISTORY" };
    }

    return { ok: true, code: "PREVIOUS", track: previous };
  }

  async next(guildId: string): Promise<NextResult> {
    const session = this.manager.find(guildId);

    if (!session || !session.current) {
      return { ok: false, code: "NOT_PLAYING" };
    }

    const next = await session.skip();

    if (!next) {
      return { ok: false, code: "NO_NEXT_TRACK" };
    }

    return { ok: true, code: "NEXT", track: next };
  }
}

export default GuildMusicController;
