import { ChildProcess, spawn } from "child_process";
import { Readable } from "stream";

export interface PlayableProcess {
  stream: Readable;
  kill(signal?: NodeJS.Signals | number): void;
}

function safeKill(
  process: ChildProcess | null | undefined,
  signal: NodeJS.Signals | number = "SIGKILL",
) {
  if (!process || process.killed) return;

  try {
    process.kill(signal);
  } catch {
    // ignore
  }
}

function bindStderr(process: ChildProcess, tag: string) {
  process.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) {
      console.error(`[${tag}] ${text}`);
    }
  });
}

function createDisposer(teardown: (signal: NodeJS.Signals | number) => void) {
  let disposed = false;

  return (signal: NodeJS.Signals | number = "SIGKILL") => {
    if (disposed) return;
    disposed = true;
    teardown(signal);
  };
}

export function createDirectPlayable(url: string): PlayableProcess {
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-nostdin",
      "-reconnect",
      "1",
      "-reconnect_streamed",
      "1",
      "-reconnect_delay_max",
      "5",
      "-i",
      url,
      "-analyzeduration",
      "0",
      "-loglevel",
      "error",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
      "pipe:1",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  bindStderr(ffmpeg, "ffmpeg");

  const kill = createDisposer((signal) => {
    safeKill(ffmpeg, signal);
  });

  ffmpeg.once("error", () => kill());
  ffmpeg.stdout?.once("close", () => kill());

  return {
    stream: ffmpeg.stdout!,
    kill,
  };
}

export function createYtdlpPlayable(inputUrl: string): PlayableProcess {
  const ytdlp = spawn(
    "yt-dlp",
    [
      "--quiet",
      "--no-playlist",
      "--format",
      "bestaudio/best",
      "--output",
      "-",
      inputUrl,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-nostdin",
      "-i",
      "pipe:0",
      "-analyzeduration",
      "0",
      "-loglevel",
      "error",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  bindStderr(ytdlp, "yt-dlp");
  bindStderr(ffmpeg, "ffmpeg");

  ytdlp.stdout!.pipe(ffmpeg.stdin!);

  ffmpeg.stdin!.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code !== "EPIPE" && error.code !== "ERR_STREAM_DESTROYED") {
      console.error("[ffmpeg:stdin]", error);
      kill();
    }
  });

  const kill = createDisposer((signal) => {
    try {
      ytdlp.stdout?.unpipe(ffmpeg.stdin!);
    } catch {
      // ignore
    }

    try {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        ffmpeg.stdin.destroy();
      }
    } catch {
      // ignore
    }

    safeKill(ytdlp, signal);
    safeKill(ffmpeg, signal);
  });

  ytdlp.once("close", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[yt-dlp] exited with code ${code}`);
    }

    try {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed && !ffmpeg.killed) {
        ffmpeg.stdin.end();
      }
    } catch {
      // ignore
    }
  });

  ytdlp.once("error", () => kill());
  ffmpeg.once("error", () => kill());

  ytdlp.stdout?.once("close", () => {
    try {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed && !ffmpeg.killed) {
        ffmpeg.stdin.end();
      }
    } catch {
      // ignore
    }
  });

  ffmpeg.stdout?.once("close", () => kill());
  ffmpeg.stdout?.once("end", () => kill());

  return { stream: ffmpeg.stdout!, kill };
}
