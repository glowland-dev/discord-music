export function isYouTubePlaylistUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    const isYouTubeHost =
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtu.be";

    if (!isYouTubeHost) {
      return false;
    }

    if (url.searchParams.has("list")) {
      return true;
    }

    return url.pathname === "/playlist";
  } catch {
    return false;
  }
}
