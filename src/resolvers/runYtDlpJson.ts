import { spawn } from "child_process";

export class YtDlpError extends Error {
  readonly args: string[];
  readonly code?: number | null;
  readonly stderr?: string;
  readonly stdout?: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      args: string[];
      code?: number | null;
      stderr?: string;
      stdout?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "YtDlpError";
    this.args = options.args;
    this.code = options.code;
    this.stderr = options.stderr;
    this.stdout = options.stdout;
    this.cause = options.cause;
  }
}

function formatArgs(args: string[]): string {
  return args.map((value) => JSON.stringify(value)).join(" ");
}

function buildContext(args: string[]): string {
  return `yt-dlp ${formatArgs(args)}`;
}

export async function runYtDlpJson<T>(
  args: string[],
  timeoutMs = 20_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const process = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const settleReject = (error: YtDlpError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    const settleResolve = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => {
      try {
        process.kill("SIGKILL");
      } catch {
        // ignore
      }

      settleReject(
        new YtDlpError(
          `yt-dlp timed out after ${timeoutMs}ms (${buildContext(args)})`,
          {
            args,
            stderr: stderr.trim() || undefined,
            stdout: stdout.trim() || undefined,
          },
        ),
      );
    }, timeoutMs);

    process.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    process.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    process.on("error", (error: unknown) => {
      settleReject(
        new YtDlpError(`Failed to spawn yt-dlp (${buildContext(args)})`, {
          args,
          stderr: stderr.trim() || undefined,
          stdout: stdout.trim() || undefined,
          cause: error,
        }),
      );
    });

    process.on("close", (code: number | null) => {
      if (code !== 0) {
        settleReject(
          new YtDlpError(
            stderr.trim() ||
              `yt-dlp exited with code ${String(code)} (${buildContext(args)})`,
            {
              args,
              code,
              stderr: stderr.trim() || undefined,
              stdout: stdout.trim() || undefined,
            },
          ),
        );
        return;
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        settleReject(
          new YtDlpError(
            `yt-dlp returned empty stdout (${buildContext(args)})`,
            {
              args,
              code,
              stderr: stderr.trim() || undefined,
              stdout: stdout,
            },
          ),
        );
        return;
      }

      try {
        const parsed = JSON.parse(trimmed) as T;

        if (parsed === null || typeof parsed !== "object") {
          throw new Error("Parsed JSON is not an object.");
        }

        settleResolve(parsed);
      } catch (error) {
        settleReject(
          new YtDlpError(
            `yt-dlp returned invalid JSON (${buildContext(args)})`,
            {
              args,
              code,
              stderr: stderr.trim() || undefined,
              stdout: trimmed,
              cause: error,
            },
          ),
        );
      }
    });
  });
}
