export interface GuildMusicAlbum {
  name: string;
  url: string | null;
  id: string | null;
}

export interface GuildMusicTrack {
  source: "direct" | "youtube" | "search";

  requestedById: string;
  query: string;

  url: string | null;
  webpageUrl: string | null;
  streamUrl: string | null;
  originalUrl: string | null;

  title: string;
  artists: string[];
  artist: string;

  album: GuildMusicAlbum | null;

  thumbnail: string | null;
  thumbnails: string[];

  duration: number | null;
  durationString: string | null;

  trackId: string | null;
  videoId: string | null;

  releaseYear: number | null;
  releaseDate: string | null;

  isExplicit: boolean | null;

  playlistId: string | null;
  playlistTitle: string | null;
  playlistIndex: number | null;

  extractor: string | null;
  extractorKey: string | null;

  isLive: boolean;
  wasLive: boolean;
}
