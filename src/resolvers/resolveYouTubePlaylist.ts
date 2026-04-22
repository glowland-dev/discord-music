import { type GuildMusicTrack } from "../GuildMusicTrack.ts";
import { mapYouTubeInfoToTrack, type YtDlpEntry } from "./mapYouTubeInfo.ts";
import { runYtDlpJson } from "./runYtDlpJson.ts";

type YtDlpPlaylistResult = {
  id?: string;
  title?: string;
  entries?: YtDlpEntry[];
};

export async function resolveYouTubePlaylistUrl(
  query: string,
  requestedById: string,
): Promise<GuildMusicTrack[]> {
  const info = (await runYtDlpJson([
    "--dump-single-json",
    "--flat-playlist",
    query,
  ])) as YtDlpPlaylistResult;

  const entries = info.entries ?? [];

  return entries
    .filter((entry) => Boolean(entry.id))
    .map((entry, index) => {
      const webpageUrl =
        entry.webpage_url ??
        (entry.id ? `https://music.youtube.com/watch?v=${entry.id}` : null);

      return mapYouTubeInfoToTrack(
        {
          ...entry,
          webpage_url: webpageUrl ?? undefined,
          playlist_id: entry.playlist_id ?? info.id ?? undefined,
          playlist_title: entry.playlist_title ?? info.title ?? undefined,
          playlist_index: entry.playlist_index ?? index + 1,
        },
        query,
        requestedById,
        "youtube",
      );
    });
}
