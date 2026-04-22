import { type GuildMusicTrack } from "../GuildMusicTrack.ts";
import { mapYouTubeInfoToTrack, type YtDlpEntry } from "./mapYouTubeInfo.ts";
import { runYtDlpJson } from "./runYtDlpJson.ts";

type YtDlpSearchResult = { entries?: YtDlpEntry[] };

export async function resolveSearch(
  query: string,
  requestedById: string,
): Promise<GuildMusicTrack> {
  const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;

  const search = (await runYtDlpJson([
    "--dump-single-json",
    "--flat-playlist",
    "--playlist-end",
    "1",
    searchUrl,
  ])) as YtDlpSearchResult;

  const first = search.entries?.[0];
  if (!first) {
    throw new Error("No results found.");
  }

  const url =
    first.webpage_url ??
    (first.id ? `https://music.youtube.com/watch?v=${first.id}` : null) ??
    first.url ??
    first.original_url;

  if (!url) {
    throw new Error("Search result is missing URL.");
  }

  const fullInfo = (await runYtDlpJson([
    "--dump-single-json",
    "--no-playlist",
    url,
  ])) as YtDlpEntry;

  return mapYouTubeInfoToTrack(fullInfo, query, requestedById, "search");
}
