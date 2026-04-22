import { type GuildMusicTrack } from "../GuildMusicTrack.ts";
import {
  createDirectPlayable,
  createYtdlpPlayable,
} from "./PlayableProcess.ts";

export function getPlayableInput(track: GuildMusicTrack) {
  if (track.source === "direct") {
    if (!track.url) {
      throw new Error("Direct track is missing URL.");
    }

    return createDirectPlayable(track.url);
  }

  if (track.source === "youtube" || track.source === "search") {
    const input = track.streamUrl ?? track.url;

    if (!input) {
      throw new Error("Track is missing a playable input URL.");
    }

    return createYtdlpPlayable(input);
  }

  throw new Error(
    `Unsupported track source: ${String((track as GuildMusicTrack).source)}`,
  );
}
