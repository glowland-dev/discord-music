# @glowland/discord-music

Event-driven music engine for Discord bots using discord.js.

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

## Runtime Dependencies

This package automatically installs the required voice stack:

* `@discordjs/voice`
* `@discordjs/opus`

You only need to install:

* `discord.js` (peer dependency)

---

## Requirements

### FFmpeg (required)

FFmpeg must be installed and available in your system PATH.

**Windows (Chocolatey):**

```bash
choco install ffmpeg
```

**Manual:**
[https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)

**Linux:**

```bash
sudo apt install ffmpeg
```

**macOS:**

```bash
brew install ffmpeg
```

---

### yt-dlp (required)

This package relies on `yt-dlp` for audio extraction.

Install and make sure it is available in your PATH:

**Windows (Chocolatey):**

```bash
choco install yt-dlp
```

**Manual:**
[https://github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

---

## Usage

```js
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

The engine is fully event-driven. You are responsible for reacting to state changes.

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

* This package does **NOT** handle UI.
* You are responsible for embeds, buttons, and interaction layers.
* Designed as a core engine, not a full bot solution.

---

## License

ISC
