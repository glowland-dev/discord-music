# @glowland/discord-music

Event-driven music engine for Discord bots built on `discord.js`.

---

## Features

* Event-driven architecture (no UI coupling)
* Per-guild sessions
* Queue, history, and loop support
* Robust voice connection handling
* Fully typed TypeScript event system

---

## Installation

```bash
npm install @glowland/discord-music discord.js
```

---

## Dependencies

### Required

* `discord.js` (peer dependency)

You must install it yourself:

```bash
npm install discord.js
```

---

### Voice stack

This package uses:

* `@discordjs/voice` (installed automatically)

---

### Opus (optional, recommended)

```bash
npm install opusscript
```

Provides a JavaScript-based Opus encoder.

Acts as a fallback for `@discordjs/opus`.

---

### Native Opus (optional, higher performance)

```bash
npm install @discordjs/opus
```

Provides native bindings for Opus encoding.

* Better raw performance than `opusscript`
* May include high severity vulnerabilities depending on version

Use if you prioritize performance and accept the trade-offs.

---

### Encryption (optional)

```bash
npm install libsodium-wrappers
```

Used by `@discordjs/voice` for encryption.

Does **not** replace `opusscript` or `@discordjs/opus`.

---

Both are optional. The engine runs without them, but performance may be lower.

---

## Requirements

### FFmpeg (required)

FFmpeg must be installed and available in your system `PATH`.

**Windows (Chocolatey):**

```bash
choco install ffmpeg
```

**Linux:**

```bash
sudo apt install ffmpeg
```

**macOS:**

```bash
brew install ffmpeg
```

Manual:
[https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)

---

### yt-dlp (required)

Used for audio extraction.

Install and ensure it is in your `PATH`:

**Windows (Chocolatey):**

```bash
choco install yt-dlp
```

Manual:
[https://github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

---

## Usage

```ts
import {
  GuildMusicManager,
  GuildMusicController
} from "@glowland/discord-music";

const manager = new GuildMusicManager();
const controller = new GuildMusicController(manager);

manager.on("trackStart", (session, track) => {
  console.log(`Now playing: ${track.title}`);
});
```

---

## Events

The engine is fully event-driven. You react to state changes.

* `stateChange`
* `trackStart`
* `trackEnd`
* `queueUpdate`
* `pause`
* `resume`
* `stop`
* `loopChange`
* `connectionLost`
* `sessionDestroyed`
* `playbackError`

---

## Notes

* No UI included
* You handle embeds, buttons, and interactions
* Designed as a core engine, not a full bot solution

---

## License

ISC
