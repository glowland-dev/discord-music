import { type GuildMusicTrack } from "../GuildMusicTrack.ts";

export async function resolveDirectUrl(
  query: string,
  requestedById: string,
): Promise<GuildMusicTrack> {
  return {
    source: "direct",
    requestedById,
    query,

    url: query,
    webpageUrl: query,
    streamUrl: query,
    originalUrl: query,

    title: query,

    artists: ["Direct URL"],
    artist: "Direct URL",

    album: null,

    thumbnail: null,
    thumbnails: [],

    duration: null,
    durationString: null,

    trackId: null,
    videoId: null,

    releaseYear: null,
    releaseDate: null,

    isExplicit: null,

    playlistId: null,
    playlistTitle: null,
    playlistIndex: null,

    extractor: null,
    extractorKey: null,

    isLive: false,
    wasLive: false,
  };
}
