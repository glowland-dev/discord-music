import type { GuildMusicTrack } from "../GuildMusicTrack.js";
import { resolveDirectUrl } from "./directUrl.js";
import { resolveSearch } from "./search.js";
import { resolveYouTubeUrl } from "./youtube.js";
import { resolveYouTubePlaylistUrl } from "./resolveYouTubePlaylist.js";
import { isDirectUrl } from "./isDirectUrl.js";
import { isYouTubeUrl } from "./isYouTubeUrl.js";
import { isYouTubePlaylistUrl } from "./isYouTubePlaylistUrl.js";
import { ResolverCache } from "./ResolverCache.js";

export interface ResolvedTracks {
  kind: "single" | "playlist";
  tracks: GuildMusicTrack[];
}

const cache = new ResolverCache<ResolvedTracks>({
  ttlMs: 10 * 60_000,
  maxEntries: 300,
});

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function sortSearchParams(url: URL): void {
  const entries = [...url.searchParams.entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    },
  );

  url.search = "";
  for (const [key, value] of entries) {
    url.searchParams.append(key, value);
  }
}

function canonicalizeYouTubeUrl(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    let videoId = "";
    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else {
      videoId = url.searchParams.get("v") ?? "";
    }

    const playlistId = url.searchParams.get("list") ?? "";

    if (playlistId) {
      return `https://www.youtube.com/playlist?list=${playlistId}`;
    }

    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    url.protocol = "https:";
    url.hostname = host === "youtu.be" ? "www.youtube.com" : host;
    url.hash = "";
    sortSearchParams(url);
    return url.toString();
  } catch {
    return value;
  }
}

function canonicalizeDirectUrl(value: string): string {
  try {
    const url = new URL(value);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    sortSearchParams(url);
    return url.toString();
  } catch {
    return value;
  }
}

function getCacheKey(query: string): string {
  if (isYouTubePlaylistUrl(query)) {
    return `playlist:${canonicalizeYouTubeUrl(query)}`;
  }

  if (isYouTubeUrl(query)) {
    return `youtube:${canonicalizeYouTubeUrl(query)}`;
  }

  if (isDirectUrl(query)) {
    return `direct:${canonicalizeDirectUrl(query)}`;
  }

  return `search:${query.toLowerCase()}`;
}

function cloneTrack(
  track: GuildMusicTrack,
  requestedById: string,
  query: string,
): GuildMusicTrack {
  return { ...track, requestedById, query };
}

function cloneResolved(
  resolved: ResolvedTracks,
  requestedById: string,
  query: string,
): ResolvedTracks {
  return {
    kind: resolved.kind,
    tracks: resolved.tracks.map((track) =>
      cloneTrack(track, requestedById, query),
    ),
  };
}

async function resolveUncached(
  query: string,
  requestedById: string,
): Promise<ResolvedTracks> {
  if (isYouTubePlaylistUrl(query)) {
    const tracks = await resolveYouTubePlaylistUrl(query, requestedById);

    if (tracks.length === 0) {
      throw new Error("Playlist is empty.");
    }

    return { kind: "playlist", tracks };
  }

  if (isYouTubeUrl(query)) {
    return {
      kind: "single",
      tracks: [await resolveYouTubeUrl(query, requestedById)],
    };
  }

  if (isDirectUrl(query)) {
    return {
      kind: "single",
      tracks: [await resolveDirectUrl(query, requestedById)],
    };
  }

  return {
    kind: "single",
    tracks: [await resolveSearch(query, requestedById)],
  };
}

export async function resolveTrack(
  rawQuery: string,
  requestedById: string,
): Promise<ResolvedTracks> {
  const query = normalizeQuery(rawQuery);
  const key = getCacheKey(query);

  const resolved = await cache.getOrSet(key, () =>
    resolveUncached(query, requestedById),
  );
  return cloneResolved(resolved, requestedById, query);
}
