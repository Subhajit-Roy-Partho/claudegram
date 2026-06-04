# Claudegram Agent Guide

This file is the Codex-facing project guide. `CLAUDE.md` is still kept for Claude Code sessions; keep both files aligned when changing contributor workflow, command behavior, release process, or project-wide development rules.

## Project Summary

Claudegram is a TypeScript Telegram bot that connects Telegram chats to a local agent runtime. The default runtime is Claude Code through `@anthropic-ai/claude-agent-sdk`. The project also has an optional OpenCode provider path that can expose other model providers, including OpenAI/Codex-compatible model configurations when OpenCode is installed and configured by the user.

The bot is not a stateless API wrapper. It manages Telegram authentication, per-chat sessions, project directories, long-running agent requests, streaming message updates, media tools, voice transcription, TTS replies, Telegraph output, and provider/model preferences.

## Development Rules

- Use TypeScript for source changes.
- Prefer existing local utilities over new ad hoc helpers.
- Keep user-visible command changes synchronized across:
  - `src/claude/command-parser.ts` command registry and `/commands` output.
  - `src/bot/bot.ts` command handler registration.
  - `README.md` command documentation.
  - `docs/index.html` when a feature or command is added, renamed, or removed.
- Do not commit secrets from `.env`, `.telegraph-account.json`, local logs, local backups, or generated media/output directories.
- Do not revert local user changes unless the user explicitly asks for that.
- When changing external-input handling, check URL validation, path validation, and error sanitization.

## Runtime And Providers

### Claude Code

Claude Code is the primary runtime.

Important configuration:

- `ANTHROPIC_API_KEY`: optional when the user has an authenticated Claude Max/Claude Code CLI setup.
- `CLAUDE_EXECUTABLE_PATH`: path to the `claude` executable for terminal/session operations.
- `CLAUDE_USE_BUNDLED_EXECUTABLE`: whether SDK queries use the SDK-bundled executable.
- `CLAUDE_SDK_LOG_LEVEL`: `off`, `basic`, `verbose`, or `trace`.
- `DANGEROUS_MODE`: auto-approves tool permissions and must be treated as high risk.

### OpenCode / Codex-Capable Routing

The optional provider implementation is named `opencode` in code because it uses `@opencode-ai/sdk`.

Enable it with:

```bash
OPENCODE_ENABLED=true
OPENCODE_PORT=4096
# OPENCODE_BASE_URL=http://localhost:4096
```

When enabled:

- `/provider` appears in the Telegram slash menu and `/commands`.
- Users can switch between `claude` and `opencode`.
- `/model` becomes provider-aware.
- OpenCode supplies the model list from its own provider configuration. If OpenCode is configured with OpenAI/Codex-compatible models, those models are selected through `/model`.

Do not rename the internal provider type from `opencode` to `codex` unless the implementation actually changes to a direct Codex/OpenAI provider. For documentation, it is fine to describe this as "OpenCode / Codex-capable routing" when explaining how users can reach OpenAI/Codex models.

## Command Menu Source Of Truth

The command menu source of truth is `src/claude/command-parser.ts`.

That file provides:

- `getTelegramCommandList()` for Telegram `setMyCommands`.
- `getAvailableCommands()` for the bot's `/commands` response.
- `getHiddenTelegramCommandNames()` for startup logging of feature-gated commands.
- `getRecognizedBotCommandNames()` for slash-command detection in message routing.

If a command is added, removed, renamed, or feature-gated, update the command registry first. Then verify:

- The handler is registered in `src/bot/bot.ts`.
- `/commands` includes the command in the right section.
- The Telegram menu should include it unless the command is intentionally hidden by a config flag.
- README and website docs reflect the behavior.

Feature-gated commands currently include:

- `/provider`: hidden unless `OPENCODE_ENABLED=true`.
- `/reddit`: hidden unless `REDDIT_ENABLED=true`.
- `/vreddit`: hidden unless `VREDDIT_ENABLED=true`.
- `/medium`: hidden unless `MEDIUM_ENABLED=true`.
- `/extract`: hidden unless `EXTRACT_ENABLED=true`.
- `/transcribe`: hidden unless `TRANSCRIBE_ENABLED=true`.

Telegram menu registration happens at startup. After command changes, restart the bot. Some Telegram clients cache bot menus briefly; if the startup log shows the expected command count, wait or reopen the chat before assuming registration failed.

## Important Source Areas

```text
src/
├── bot/
│   ├── bot.ts                     # Bot setup, Telegram command menu, handlers
│   ├── handlers/
│   │   ├── command.handler.ts     # Slash commands and inline keyboards
│   │   ├── message.handler.ts     # Text routing, ForceReply handling, agent dispatch
│   │   ├── voice.handler.ts       # Voice-note transcription flow
│   │   └── photo.handler.ts       # Image save and agent notification
│   └── middleware/
│       ├── auth.middleware.ts      # User and group authorization
│       └── stale-filter.ts         # Ignore stale updates after restart
├── claude/
│   ├── agent.ts                   # Claude Agent SDK integration
│   ├── command-parser.ts          # Shared command registry and help text
│   ├── mcp-tools.ts               # MCP tools exposed to Claude
│   ├── request-queue.ts           # Per-session request queue and cancel/reset logic
│   ├── session-history.ts         # Persisted session history
│   ├── session-manager.ts         # Active session state
│   └── agent-watchdog.ts          # Long-running query watchdog
├── providers/
│   ├── provider-router.ts         # Active provider selection and persistence
│   ├── claude-provider.ts         # Claude provider adapter
│   ├── opencode-provider.ts       # OpenCode provider adapter
│   ├── user-preferences.ts        # Per-chat provider/model preferences
│   └── types.ts                   # Provider interfaces
├── media/
│   └── extract.ts                 # yt-dlp backed media extraction
├── reddit/
│   ├── redditfetch.ts             # Reddit OAuth client and markdown/json output
│   └── vreddit.ts                 # Reddit video download/compression
├── medium/
│   └── freedium.ts                # Medium/Freedium fetcher
├── telegram/
│   ├── markdown.ts                # MarkdownV2 escaping
│   ├── message-sender.ts          # Streaming, chunking, Telegraph routing
│   ├── telegraph.ts               # Telegraph API client
│   ├── telegraph-settings.ts      # Per-chat Telegraph settings
│   ├── terminal-renderer.ts       # Terminal-style output renderer
│   └── terminal-settings.ts       # Per-chat terminal UI setting
├── tts/
│   ├── tts.ts                     # Groq/OpenAI TTS generation
│   ├── tts-settings.ts            # Per-chat TTS settings
│   └── voice-reply.ts             # Voice reply hook
├── audio/
│   └── transcribe.ts              # Groq Whisper transcription helpers
├── utils/
│   ├── download.ts                # URL download with protections
│   ├── sanitize.ts                # Path/error sanitization
│   ├── workspace-guard.ts         # Workspace boundary checks
│   ├── session-key.ts             # DM/forum-topic session keys
│   └── atomic-write.ts            # Safe preference/settings writes
├── config.ts                      # Environment schema
└── index.ts                       # Entrypoint
```

## Verification

Use these commands before finishing code changes:

```bash
npm run typecheck
npm run build
```

For command-menu changes, also start the bot and check the startup log:

```bash
npm run dev
```

Expected log shape:

```text
Command menu registered (<count> commands) (hidden by config: ...)
```

Do not leave long-running dev servers active unless the user asked for them.

## Security Checklist

Before committing changes that touch user input, files, URLs, media downloads, subprocesses, or provider calls:

- Validate URL protocol and host behavior through existing download/media guards.
- Keep project file reads/writes inside the configured workspace root.
- Use `sanitizePath()` and `sanitizeError()` where paths or errors are shown to users.
- Avoid putting secrets in process arguments.
- Keep `.env`, account JSON files, generated output, and logs out of commits.
- Treat `DANGEROUS_MODE=true` as explicitly unsafe and document any behavior that relies on it.

## Documentation Checklist

Update docs when behavior changes:

- `README.md`: user-facing setup, command, provider, and troubleshooting docs.
- `AGENTS.md`: Codex-facing workflow and architecture guidance.
- `CLAUDE.md`: Claude-facing workflow guidance if the same rules changed.
- `docs/index.html`: website content for user-facing feature or command changes.

For command-menu changes, document whether missing commands are expected because a feature flag is disabled.
