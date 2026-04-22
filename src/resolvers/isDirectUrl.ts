const DIRECT_MEDIA_EXTENSIONS = new Set([
  "aac",
  "flac",
  "m4a",
  "mka",
  "mp3",
  "mp4",
  "ogg",
  "oga",
  "opus",
  "wav",
  "weba",
  "webm",
  "m3u8",
  "mpd",
  "ts",
]);

const DIRECT_MEDIA_HOSTS = new Set([
  "cdn.discordapp.com",
  "media.discordapp.net",
  "files.catbox.moe",
  "listen.moe",
  "archive.org",
  "ia802*",
  "ia6*",
  "ia8*",
  "soundcloudcdn.com",
  "cf-hls-media.sndcdn.com",
  "audio-ssl.itunes.apple.com",
]);

function matchesKnownMediaHost(host: string): boolean {
  for (const entry of DIRECT_MEDIA_HOSTS) {
    if (entry.endsWith("*")) {
      const prefix = entry.slice(0, -1);
      if (host.startsWith(prefix)) return true;
      continue;
    }

    if (host === entry || host.endsWith(`.${entry}`)) {
      return true;
    }
  }

  return false;
}

function getPathExtension(pathname: string): string | null {
  const lastSegment = pathname.split("/").filter(Boolean).at(-1);
  if (!lastSegment || !lastSegment.includes(".")) {
    return null;
  }

  return lastSegment.split(".").at(-1)?.toLowerCase() ?? null;
}

export function isDirectUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    const extension = getPathExtension(url.pathname);
    if (extension && DIRECT_MEDIA_EXTENSIONS.has(extension)) {
      return true;
    }

    const host = url.hostname.toLowerCase();
    if (matchesKnownMediaHost(host)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
