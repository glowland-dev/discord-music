import {
  type GuildMusicAlbum,
  type GuildMusicTrack,
} from "../GuildMusicTrack.ts";

export type YtDlpThumbnail = { url?: string };

export type YtDlpEntry = {
  id?: string;
  title?: string;

  webpage_url?: string;
  original_url?: string;
  url?: string;

  channel?: string;
  uploader?: string;

  track?: string;
  track_id?: string;

  artist?: string;
  artists?: string[];

  album?: string;

  thumbnail?: string;
  thumbnails?: YtDlpThumbnail[];

  duration?: number;
  duration_string?: string;

  release_year?: number;
  release_date?: string;
  upload_date?: string;

  is_live?: boolean;
  was_live?: boolean;

  playlist_id?: string;
  playlist_title?: string;
  playlist_index?: number;

  extractor?: string;
  extractor_key?: string;
};

function normalizeArtists(info: YtDlpEntry): string[] {
  if (Array.isArray(info.artists) && info.artists.length > 0) {
    return info.artists
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
  }

  if (info.artist?.trim()) {
    return info.artist
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return [info.channel ?? info.uploader ?? "Unknown artist"];
}

function normalizeAlbum(info: YtDlpEntry): GuildMusicAlbum | null {
  if (!info.album) return null;

  return { name: info.album, url: null, id: null };
}

function inferWebpageUrl(info: YtDlpEntry): string | null {
  if (info.webpage_url) return info.webpage_url;
  if (info.id) return `https://music.youtube.com/watch?v=${info.id}`;
  return info.original_url ?? info.url ?? null;
}

export function mapYouTubeInfoToTrack(
  info: YtDlpEntry,
  query: string,
  requestedById: string,
  source: "youtube" | "search",
): GuildMusicTrack {
  const thumbnails = (info.thumbnails ?? [])
    .map((thumb) => thumb.url)
    .filter((url): url is string => Boolean(url));

  const thumbnail = thumbnails.at(-1) ?? info.thumbnail ?? null;
  const artists = normalizeArtists(info);
  const album = normalizeAlbum(info);
  const webpageUrl = inferWebpageUrl(info);

  return {
    source,
    requestedById,
    query,

    url: webpageUrl,
    webpageUrl,
    streamUrl: info.url ?? null,
    originalUrl: info.original_url ?? null,

    title: info.track ?? info.title ?? query,
    artists,
    artist: artists[0] ?? "Unknown artist",

    album,

    thumbnail,
    thumbnails,

    duration: info.duration ?? null,
    durationString: info.duration_string ?? null,

    trackId: info.track_id ?? info.id ?? null,
    videoId: info.id ?? null,

    releaseYear: info.release_year ?? null,
    releaseDate: info.release_date ?? info.upload_date ?? null,

    isExplicit: null,

    playlistId: info.playlist_id ?? null,
    playlistTitle: info.playlist_title ?? null,
    playlistIndex: info.playlist_index ?? null,

    extractor: info.extractor ?? null,
    extractorKey: info.extractor_key ?? null,

    isLive: info.is_live ?? false,
    wasLive: info.was_live ?? false,
  };
}
