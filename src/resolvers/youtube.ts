import { type GuildMusicTrack } from "../GuildMusicTrack.ts";
import { mapYouTubeInfoToTrack, type YtDlpEntry } from "./mapYouTubeInfo.ts";
import { runYtDlpJson } from "./runYtDlpJson.ts";

export async function resolveYouTubeUrl(
  query: string,
  requestedById: string,
): Promise<GuildMusicTrack> {
  const info = (await runYtDlpJson([
    "--dump-single-json",
    "--no-playlist",
    query,
  ])) as YtDlpEntry;

  return mapYouTubeInfoToTrack(info, query, requestedById, "youtube");
}
