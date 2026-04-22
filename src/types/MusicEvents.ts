import type GuildMusicSession from "../GuildMusicSession.js";
import type { GuildMusicTrack } from "../GuildMusicTrack.js";

export interface MusicEvents {
  stateChange: [session: GuildMusicSession];

  trackStart: [session: GuildMusicSession, track: GuildMusicTrack];
  trackEnd: [session: GuildMusicSession, track: GuildMusicTrack];

  queueUpdate: [session: GuildMusicSession];

  pause: [session: GuildMusicSession];
  resume: [session: GuildMusicSession];
  stop: [session: GuildMusicSession];

  loopChange: [session: GuildMusicSession, enabled: boolean];

  connectionLost: [session: GuildMusicSession];
  sessionDestroyed: [session: GuildMusicSession];

  playbackError: [session: GuildMusicSession, error: unknown];
}
