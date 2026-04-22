import type GuildMusicSession from "../GuildMusicSession.js";

export type MusicPanelRenderer = (session: GuildMusicSession) => Promise<void>;
