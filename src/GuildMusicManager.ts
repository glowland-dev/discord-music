import GuildMusicSession from "./GuildMusicSession.js";
import type { MusicEvents } from "./types/MusicEvents.js";
import { TypedEventEmitter } from "./types/TypedEventEmitter.js";

class GuildMusicManager extends TypedEventEmitter<MusicEvents> {
  private readonly sessions = new Map<string, GuildMusicSession>();

  get(guildId: string): GuildMusicSession {
    let session = this.sessions.get(guildId);

    if (!session) {
      session = new GuildMusicSession(guildId);
      this.bindSession(session);
      this.sessions.set(guildId, session);
    }

    return session;
  }

  find(guildId: string): GuildMusicSession | undefined {
    return this.sessions.get(guildId);
  }

  async delete(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    await session.leave();
    this.sessions.delete(guildId);
  }

  private bindSession(session: GuildMusicSession): void {
    session.on("stateChange", (s) => this.emit("stateChange", s));
    session.on("trackStart", (s, track) => this.emit("trackStart", s, track));
    session.on("trackEnd", (s, track) => this.emit("trackEnd", s, track));
    session.on("queueUpdate", (s) => this.emit("queueUpdate", s));
    session.on("pause", (s) => this.emit("pause", s));
    session.on("resume", (s) => this.emit("resume", s));
    session.on("stop", (s) => this.emit("stop", s));
    session.on("loopChange", (s, enabled) =>
      this.emit("loopChange", s, enabled),
    );
    session.on("connectionLost", (s) => this.emit("connectionLost", s));
    session.on("sessionDestroyed", (s) => this.emit("sessionDestroyed", s));
    session.on("playbackError", (s, error) =>
      this.emit("playbackError", s, error),
    );
  }
}

export default GuildMusicManager;
