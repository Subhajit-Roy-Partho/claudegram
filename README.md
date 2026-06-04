<div align="center">

# Claudegram

**Your personal AI agent, running on your machine, controlled from Telegram.**

[![Website](https://img.shields.io/badge/Website-claudegram.com-00ffd5?logo=googlechrome&logoColor=white)](https://claudegram.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Claude](https://img.shields.io/badge/Claude_Agent_SDK-Anthropic-cc785c?logo=anthropic&logoColor=white)](https://docs.anthropic.com/en/docs/claude-code)
[![Telegram](https://img.shields.io/badge/Telegram_Bot-Grammy-26a5e4?logo=telegram&logoColor=white)](https://grammy.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<br />

```
  Telegram  ──▶  Grammy Bot  ──▶  Provider Router  ──▶  Local Agent Runtime
  voice/text     command menu       Claude/OpenCode       bash, files, code
```

</div>

---

## What is this?

Claudegram bridges Telegram to a **full local AI agent** running on your machine. The primary runtime is Claude Code through the Claude Agent SDK. An optional OpenCode provider can also be enabled when you want to route work through other configured model providers, including OpenAI/Codex-compatible models if your OpenCode setup exposes them.

Send a message in Telegram and the agent can read your files, run commands, write code, fetch Reddit threads, fetch Medium articles, extract/transcribe media, and speak responses back. All from your phone.

This is not a simple API wrapper. It is a real local agent runtime with tool access — Bash, file I/O, code editing, web/media helpers, session memory, provider/model preferences, and rich Telegram output formatting.

---

## Features

<table>
<tr>
<td width="50%" valign="top">

### Agent Core
- Full Claude Code with tool access (Bash, Read, Write, Edit, Glob, Grep)
- Optional OpenCode provider for non-Claude model routing
- Session resume across messages — Claude remembers everything
- Project-based working directories
- Streaming responses with live-updating messages
- Provider-aware model picker
- Plan mode, explore mode, loop mode

### Reddit Integration
- `/reddit` — posts, subreddits, user profiles
- `/vreddit` — download & send Reddit-hosted videos
- Auto-compression for videos > 50 MB (CRF → two-pass)
- Original oversized videos archived locally
- Large threads auto-export to JSON

### Media Extraction
- `/extract` — YouTube, Instagram, TikTok video/audio/transcript
- Text, audio (MP3), video (MP4), or all modes
- Requires yt-dlp, ffmpeg (system binaries)

### Medium Integration
- `/medium` — fetch paywalled articles via Freedium
- Telegraph Instant View, save as Markdown, or both
- Pure TypeScript, no Python/Playwright needed

</td>
<td width="50%" valign="top">

### Voice & Audio
- Send a voice note → transcribed via Groq Whisper → fed to Claude
- `/transcribe` — standalone transcription (reply-to or prompt)
- `/tts` — agent responses spoken back as Telegram voice notes
- 13 voices via OpenAI TTS (`gpt-4o-mini-tts`)

### Rich Output
- MarkdownV2 formatting with automatic escaping
- Telegraph Instant View for long responses & tables
- Smart chunking that preserves code blocks
- ForceReply interactive prompts for multi-step commands
- `/teleport` — fork session to terminal for continued work
- Inline keyboards for settings (model, mode, TTS, clear)

### Terminal UI
- Terminal-style display with tool status spinners
- Shows what Claude is doing in real time
- Toggle with `/terminalui`

### MCP Tools (Intelligent Routing)
- Talk naturally — Claude auto-uses the right tools
- Reddit, Medium, YouTube, project management via MCP
- No explicit commands needed for common tasks

### Forum Topic Sessions
- Each forum topic runs as an independent session
- Work on multiple projects in parallel across topics

### Image Uploads
- Send photos or image docs in chat
- Saved to project under `.claudegram/uploads/`
- Claude is notified with path + caption

</td>
</tr>
</table>

---

## Quick Start

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 20+** | with npm; matches `package.json` engine requirement |
| **Claude Code CLI** | installed and authenticated — `claude` in your PATH |
| **Telegram bot token** | from [@BotFather](https://t.me/botfather) |
| **Your Telegram user ID** | from [@userinfobot](https://t.me/userinfobot) |

### Setup

```bash
git clone https://github.com/NachoSEO/claudegram.git
cd claudegram
cp .env.example .env
```

Edit `.env`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
ALLOWED_USER_IDS=your_user_id
```

### Run

```bash
npm install
npm run dev        # dev mode with hot reload
```

Open your bot in Telegram → `/start`

---

## Commands

Telegram has two command surfaces:

- The Telegram slash-command menu, registered at bot startup with `setMyCommands`.
- The bot's own `/commands` response.

Both are generated from the same command registry in `src/claude/command-parser.ts`, so they should stay in sync. Some commands are intentionally hidden when their feature flag is disabled. After changing `.env`, restart the bot so Telegram receives a fresh command menu.

### Session
| Command | Description |
|---------|-------------|
| `/start` | Show welcome text, initial setup hints, and the current response mode. |
| `/commands` | Show the full command list that is available under the current configuration. |
| `/project` | Open the interactive project browser and set the current working directory. |
| `/project <path>` | Set the working directory directly. Paths must remain inside `WORKSPACE_DIR`. |
| `/newproject <name>` | Create a new project directory under `WORKSPACE_DIR` and switch to it. |
| `/status` | Show current project, provider, model, session ID, dangerous-mode state, and usage when available. |
| `/clear` | Clear the current conversation and session state after confirmation. |
| `/sessions` | List saved sessions for the chat. |
| `/resume` | Pick a recent saved session to resume. |
| `/continue` | Resume the most recent saved session. |
| `/teleport` | Show a terminal command for continuing the Claude session outside Telegram. |

### Agent Modes
| Command | Description |
|---------|-------------|
| `/plan` | Ask the agent to create a plan for a complex task before execution. |
| `/explore` | Ask the agent to inspect the current project and answer an architecture/codebase question. |
| `/loop` | Run iteratively until the task is complete or `MAX_LOOP_ITERATIONS` is reached. |
| `/model` | Open the model picker for the active provider. Claude shows Claude models; OpenCode shows configured OpenCode models. |
| `/model <id>` | Set the active model directly by ID. |
| `/provider` | Switch between `claude` and `opencode`. Hidden unless `OPENCODE_ENABLED=true`. |
| `/mode` | Toggle between streaming responses and wait-for-completion responses. |
| `/terminalui` | Toggle terminal-style progress output with tool status updates. |

### Content
| Command | Description |
|---------|-------------|
| `/reddit` | Fetch Reddit posts, subreddits, comments, or user profiles. Hidden unless `REDDIT_ENABLED=true`. |
| `/vreddit` | Download Reddit-hosted videos and compress when needed. Hidden unless `VREDDIT_ENABLED=true`. |
| `/medium` | Fetch Medium articles via the configured Freedium mirror. Hidden unless `MEDIUM_ENABLED=true`. |
| `/file` | Download a file from the active project. |
| `/telegraph` | Toggle Telegraph Instant View for long responses, or publish markdown as a Telegraph page. |
| `/extract <url>` | Extract transcript, audio, video, or all outputs from YouTube, TikTok, or Instagram. Hidden unless `EXTRACT_ENABLED=true`. |

### Voice & TTS
| Command | Description |
|---------|-------------|
| `/tts` | Toggle voice replies, choose a voice, and toggle autoplay. |
| `/transcribe` | Transcribe audio to text. Hidden unless `TRANSCRIBE_ENABLED=true`. |
| *Send voice note* | Auto-transcribed and passed to the active agent when transcription is enabled. |

### Utility
| Command | Description |
|---------|-------------|
| `/ping` | Health check that bypasses the per-chat queue. |
| `/context` | Show Claude context/token usage for the current session. |
| `/botstatus` | Show bot process status and uptime. |
| `/restartbot` | Restart the bot through the control script after confirmation. |
| `/cancel` | Cancel the current in-flight request without waiting for the queue. |
| `/softreset` | Cancel the current request, clear the request queue, and clear current session history. |

### Why a Command May Not Appear in Telegram

The startup log now prints the registered command count and the commands hidden by configuration:

```text
Command menu registered (30 commands) (hidden by config: provider)
```

Expected hidden commands:

| Command | Required setting |
|---------|------------------|
| `/provider` | `OPENCODE_ENABLED=true` |
| `/reddit` | `REDDIT_ENABLED=true` |
| `/vreddit` | `VREDDIT_ENABLED=true` |
| `/medium` | `MEDIUM_ENABLED=true` |
| `/extract` | `EXTRACT_ENABLED=true` |
| `/transcribe` | `TRANSCRIBE_ENABLED=true` |

If the log shows the command was registered but Telegram still does not show it, restart the Telegram client or reopen the bot chat. Telegram clients can cache bot command menus briefly.

---

## Optional Integrations

<details>
<summary><strong>Reddit — <code>/reddit</code> & <code>/vreddit</code></strong></summary>

`/reddit` is now a pure TypeScript module using Reddit's OAuth2 API directly — no external Python dependency.

```bash
# .env
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=bot_account
REDDIT_PASSWORD=bot_password
```

Create a "script" app at https://www.reddit.com/prefs/apps/. Use a dedicated bot account — NOT your personal credentials. Video downloads need `ffmpeg` and `ffprobe` on your PATH.

</details>

<details>
<summary><strong>Medium — <code>/medium</code></strong></summary>

Pure TypeScript via Freedium mirror — no extra dependencies.

```bash
# .env (optional tuning)
FREEDIUM_HOST=freedium-mirror.cfd
MEDIUM_TIMEOUT_MS=15000
```

</details>

<details>
<summary><strong>Voice Transcription — Groq Whisper</strong></summary>

```bash
# .env
GROQ_API_KEY=your_groq_key
GROQ_TRANSCRIBE_PATH=/absolute/path/to/groq_transcribe.py
```

</details>

<details>
<summary><strong>Text-to-Speech — OpenAI TTS</strong></summary>

```bash
# .env
OPENAI_API_KEY=your_openai_key
TTS_MODEL=gpt-4o-mini-tts
TTS_VOICE=coral
TTS_RESPONSE_FORMAT=opus
```

13 voices available: `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `marin`, `nova`, `onyx`, `sage`, `shimmer`, `verse`

</details>

<details>
<summary><strong>OpenCode Provider — Claude plus OpenAI/Codex-capable model routing</strong></summary>

Claudegram's default provider is `claude`. When `OPENCODE_ENABLED=true`, the bot registers `/provider` and lets each chat switch between:

- `claude` — Claude Code SDK, the default local agent runtime.
- `opencode` — OpenCode SDK, using the models/providers configured in OpenCode.

This is the current path for using OpenAI/Codex-compatible model configurations from Telegram. Claudegram does not rename the internal provider to `codex`, because the implementation is OpenCode. If your OpenCode configuration exposes OpenAI or Codex-style models, they appear under `/model` after switching to `opencode`.

```bash
# .env
OPENCODE_ENABLED=true

# Optional: connect to an already-running OpenCode server
OPENCODE_BASE_URL=http://localhost:4096

# Optional: embedded/default OpenCode server port
OPENCODE_PORT=4096
```

Usage flow:

```text
/provider   -> choose opencode
/model      -> choose a model from OpenCode's configured provider list
```

If `/provider` is missing from Telegram's slash menu, check the startup log. It is hidden by design when `OPENCODE_ENABLED=false`.

</details>

---

## Configuration Reference

All config lives in `.env`. See [`.env.example`](.env.example) for the full annotated reference.

### Required

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `ALLOWED_USER_IDS` | Comma-separated Telegram user IDs |

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | API key (optional with Claude Max subscription) |
| `WORKSPACE_DIR` | `$HOME` | Root directory for project picker |
| `CLAUDE_EXECUTABLE_PATH` | `claude` | Path to Claude Code CLI |
| `CLAUDE_USE_BUNDLED_EXECUTABLE` | `true` | Use the Claude Agent SDK bundled executable for agent queries |
| `BOT_NAME` | `Claudegram` | Bot name in system prompt |
| `STREAMING_MODE` | `streaming` | `streaming` or `wait` |
| `DANGEROUS_MODE` | `false` | Auto-approve all tool permissions |
| `CANCEL_ON_NEW_MESSAGE` | `false` | Auto-cancel running query on new message |
| `CLAUDE_SDK_LOG_LEVEL` | `basic` | SDK log level: off, basic, verbose, trace |

### Provider Routing

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_ENABLED` | `false` | Enable `/provider` and the optional OpenCode provider |
| `OPENCODE_BASE_URL` | — | URL of an already-running OpenCode server |
| `OPENCODE_PORT` | `4096` | Port for embedded/default OpenCode server |

### Reddit

| Variable | Default | Description |
|----------|---------|-------------|
| `REDDIT_CLIENT_ID` | — | Reddit OAuth2 client ID |
| `REDDIT_CLIENT_SECRET` | — | Reddit OAuth2 client secret |
| `REDDIT_USERNAME` | — | Reddit bot account username |
| `REDDIT_PASSWORD` | — | Reddit bot account password |
| `REDDIT_VIDEO_MAX_SIZE_MB` | `50` | Max video size before compression |
| `REDDITFETCH_TIMEOUT_MS` | `30000` | Execution timeout |
| `REDDITFETCH_JSON_THRESHOLD_CHARS` | `8000` | Auto-switch to JSON output |

### Medium / Freedium

| Variable | Default | Description |
|----------|---------|-------------|
| `FREEDIUM_HOST` | `freedium-mirror.cfd` | Freedium mirror host |
| `MEDIUM_TIMEOUT_MS` | `15000` | Fetch timeout |
| `MEDIUM_FILE_THRESHOLD_CHARS` | `8000` | File save threshold |

### Media Extraction

| Variable | Default | Description |
|----------|---------|-------------|
| `EXTRACT_ENABLED` | `true` | Enable /extract command |
| `YTDLP_COOKIES_PATH` | — | Netscape cookies.txt for yt-dlp |

### Voice & TTS

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API key for Whisper |
| `GROQ_TRANSCRIBE_PATH` | — | Path to `groq_transcribe.py` |
| `OPENAI_API_KEY` | — | OpenAI API key for TTS |
| `TTS_VOICE` | `coral` | Default TTS voice |
| `TTS_MODEL` | `gpt-4o-mini-tts` | TTS model |
| `VOICE_SHOW_TRANSCRIPT` | `true` | Show transcript text before agent response |

---

## Architecture

```
src/
├── bot/
│   ├── bot.ts                     # Bot setup, handler registration
│   ├── handlers/
│   │   ├── command.handler.ts     # All slash commands + inline keyboards
│   │   ├── message.handler.ts     # Text routing, ForceReply dispatch
│   │   ├── voice.handler.ts       # Voice download, transcription, agent relay
│   │   └── photo.handler.ts       # Image save + agent notification
│   └── middleware/
│       ├── auth.middleware.ts      # User whitelist + group chat auth
│       └── stale-filter.ts        # Ignore stale messages on restart
├── claude/
│   ├── agent.ts                   # Claude Agent SDK, session resume, system prompt
│   ├── mcp-tools.ts              # MCP server: Reddit, Medium, Extract, Telegraph tools
│   ├── session-manager.ts         # Per-chat session state
│   ├── session-history.ts         # Session persistence and history
│   ├── request-queue.ts           # Sequential request queue
│   ├── command-parser.ts          # Shared command registry, menu, help text
│   └── agent-watchdog.ts          # Watchdog for long-running agent tasks
├── providers/
│   ├── provider-router.ts         # Per-chat provider selection and persistence
│   ├── claude-provider.ts         # Claude provider adapter
│   ├── opencode-provider.ts       # OpenCode provider adapter
│   ├── user-preferences.ts        # Per-chat provider/model preferences
│   └── types.ts                   # Provider interfaces
├── reddit/
│   ├── redditfetch.ts             # Native TypeScript Reddit client (OAuth2)
│   └── vreddit.ts                 # Reddit video download + compression pipeline
├── medium/
│   └── freedium.ts                # Freedium article fetcher
├── media/
│   └── extract.ts                 # YouTube/TikTok/Instagram extraction (yt-dlp)
├── telegram/
│   ├── message-sender.ts          # Streaming, chunking, Telegraph routing
│   ├── markdown.ts                # MarkdownV2 escaping
│   ├── telegraph.ts               # Telegraph Instant View client
│   ├── telegraph-settings.ts      # Per-chat Telegraph toggle
│   ├── terminal-renderer.ts       # Terminal-style UI renderer
│   ├── terminal-settings.ts       # Per-chat terminal UI toggle
│   └── deduplication.ts           # Message dedup
├── tts/
│   ├── tts.ts                     # TTS provider routing (Groq Orpheus / OpenAI)
│   ├── tts-settings.ts            # Per-chat voice settings
│   └── voice-reply.ts             # TTS hook for agent responses
├── audio/
│   └── transcribe.ts              # Shared transcription utilities
├── utils/
│   ├── download.ts                # URL download with SSRF protection
│   ├── sanitize.ts                # Path and error sanitization
│   ├── workspace-guard.ts         # Workspace boundary enforcement
│   ├── url-guard.ts               # URL validation (protocol, SSRF)
│   ├── file-type.ts               # File content validation
│   ├── caffeinate.ts              # macOS sleep prevention
│   ├── session-key.ts             # Session key generation (DM + forum topics)
│   ├── agent-timer.ts             # Agent execution timing
│   └── debug-agent.ts             # Debug utilities
├── config.ts                      # Zod-validated environment config
└── index.ts                       # Entry point
```

---

## Development

```bash
npm run dev          # Dev mode with hot reload (tsx watch)
npm run typecheck    # Type check only
npm run build        # Compile to dist/
npm start            # Run compiled build
```

### Bot Control Script

```bash
./scripts/claudegram-botctl.sh dev start      # Start dev mode
./scripts/claudegram-botctl.sh dev restart     # Restart dev
./scripts/claudegram-botctl.sh prod start      # Start production
./scripts/claudegram-botctl.sh dev log         # Tail logs
./scripts/claudegram-botctl.sh dev status      # Check if running
```

### Self-Editing Workflow

If Claudegram is editing its own codebase, use **prod mode** to avoid hot-reload restarts:

```bash
./scripts/claudegram-botctl.sh prod start      # No hot reload
# ... let Claude edit files ...
./scripts/claudegram-botctl.sh prod restart     # Apply changes
```

Then `/continue` or `/resume` in Telegram to restore your session.

---

## Security

- **User whitelist** — only approved Telegram IDs can interact
- **Project sandbox** — the active agent operates within the configured working directory
- **Permission mode** — uses `acceptEdits` by default
- **Dangerous mode** — opt-in auto-approve for all tool permissions
- **Secrets** — loaded from `.env` (gitignored), never committed

---

## Credits

Original project by [NachoSEO](https://github.com/NachoSEO/claudegram). Extended with Reddit video downloads, voice transcription, TTS, Medium integration, Telegraph output, image uploads, and session continuity.

## License

MIT
