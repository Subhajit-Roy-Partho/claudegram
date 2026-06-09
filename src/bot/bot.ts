import { Bot, type Context } from 'grammy';
import { autoRetry } from '@grammyjs/auto-retry';
import { sequentialize } from '@grammyjs/runner';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from '../config.js';
import { buildSessionKey } from '../utils/session-key.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import {
  handleStart,
  handleClear,
  handleClearCallback,
  handleProject,
  handleNewProject,
  handleProjectCallback,
  handleStatus,
  handleMode,
  handleModeCallback,
  handleTTS,
  handleTTSCallback,
  handleTelegraph,
  handleTelegraphCallback,
  handleBotStatus,
  handleRestartBot,
  handleRestartCallback,
  handleContext,
  handlePing,
  handleCancel,
  handleCommands,
  handleModelCommand,
  handleModelCallback,
  handleProviderCommand,
  handleProviderCallback,
  handlePlan,
  handleExplore,
  handleResume,
  handleResumeCallback,
  handleContinue,
  handleLoop,
  handleSessions,
  handleTeleport,
  handleFile,
  handleReddit,
  handleVReddit,
  handleMedium,
  handleMediumCallback,
  handleTerminalUI,
  handleTerminalUICallback,
  handleTranscribe,
  handleTranscribeAudio,
  handleTranscribeDocument,
  handleExtract,
  handleExtractCallback,
  handleRedditActionCallback,
  handleReset,
  handleResetCallback,
} from './handlers/command.handler.js';
import { handleMessage } from './handlers/message.handler.js';
import { handleVoice } from './handlers/voice.handler.js';
import { handlePhoto, handleImageDocument } from './handlers/photo.handler.js';
import { getHiddenTelegramCommandNames, getTelegramCommandList } from '../claude/command-parser.js';

// Resolve sequentialize constraint: same-chat updates are ordered,
// but /cancel is registered BEFORE this middleware so it bypasses it.
function getSequentializeKey(ctx: Context): string | undefined {
  const chatId = ctx.chat?.id;
  if (!chatId) return undefined;
  const msg = (ctx.message ?? ctx.callbackQuery?.message) as
    | { is_topic_message?: boolean; message_thread_id?: number }
    | undefined;
  const threadId = msg?.is_topic_message ? msg.message_thread_id : undefined;
  return buildSessionKey(chatId, threadId);
}

export async function createBot(): Promise<Bot> {
  // Support HTTP/HTTPS/SOCKS proxy for Telegram API (useful in restricted networks)
  const proxyUrl = config.TELEGRAM_PROXY_URL
    || process.env.HTTPS_PROXY || process.env.https_proxy
    || process.env.HTTP_PROXY || process.env.http_proxy;

  const baseFetchConfig = proxyUrl
    ? { agent: new HttpsProxyAgent(proxyUrl) }
    : undefined;

  if (proxyUrl) {
    console.log(`[Bot] Using proxy: ${proxyUrl}`);
  }

  const bot = new Bot(config.TELEGRAM_BOT_TOKEN, {
    client: {
      // Default is 500s which causes long hangs on network interruptions.
      // 60s is enough for long polling (30s) + file uploads while recovering
      // from stuck connections much faster.
      timeoutSeconds: 60,
      baseFetchConfig,
    },
  });

  // Auto-retry on transient network errors (ECONNRESET, socket hang up, etc.)
  // Also handles 429 rate limits by respecting Telegram's retry_after
  bot.api.config.use(autoRetry({
    maxRetryAttempts: 5,
    maxDelaySeconds: 60, // Cap retry delay at 60 seconds (will retry sooner rather than wait 900s)
    rethrowInternalServerErrors: false, // Retry on 5xx errors
  }));

  // Register command menu for autocomplete. This uses the same registry as /commands
  // so Telegram's slash menu and the bot's help text do not drift apart.
  const commandList = getTelegramCommandList();
  bot.api.setMyCommands(commandList).then(() => {
    const hidden = getHiddenTelegramCommandNames();
    const hiddenSuffix = hidden.length > 0 ? ` (hidden by config: ${hidden.join(', ')})` : '';
    console.log(`📋 Command menu registered (${commandList.length} commands)${hiddenSuffix}`);
  }).catch((err) => {
    console.warn('⚠️ Failed to register commands:', err.message);
  });

  // Apply auth middleware to all updates
  bot.use(authMiddleware);

  // /cancel, /reset, and /ping fire BEFORE sequentialize so they bypass per-chat ordering.
  // This lets them interrupt a running query without waiting for it to finish.
  bot.command('cancel', handleCancel);
  bot.command('softreset', handleReset);
  bot.command('ping', handlePing);

  // Sequentialize: same-chat updates are processed in order.
  // This runs AFTER /cancel so cancel bypasses it.
  bot.use(sequentialize(getSequentializeKey));

  // Bot command handlers (sequentialized per chat)
  bot.command('start', handleStart);
  bot.command('clear', handleClear);
  bot.command('project', handleProject);
  bot.command('newproject', handleNewProject);
  bot.command('status', handleStatus);
  bot.command('mode', handleMode);
  bot.command('terminalui', handleTerminalUI);
  bot.command('tts', handleTTS);
  bot.command('botstatus', handleBotStatus);
  bot.command('restartbot', handleRestartBot);
  bot.command('context', handleContext);

  bot.command('commands', handleCommands);
  bot.command('model', handleModelCommand);
  if (config.OPENCODE_ENABLED || config.CODEX_ENABLED) {
    bot.command('provider', handleProviderCommand);
  }
  bot.command('plan', handlePlan);
  bot.command('explore', handleExplore);

  // Session resume commands
  bot.command('resume', handleResume);
  bot.command('continue', handleContinue);
  bot.command('sessions', handleSessions);

  // Loop mode
  bot.command('loop', handleLoop);

  // Teleport to terminal
  bot.command('teleport', handleTeleport);

  // File commands
  bot.command('file', handleFile);
  bot.command('telegraph', handleTelegraph);

  // Reddit
  if (config.REDDIT_ENABLED) {
    bot.command('reddit', handleReddit);
  }
  if (config.VREDDIT_ENABLED) {
    bot.command('vreddit', handleVReddit);
  }
  if (config.MEDIUM_ENABLED) {
    bot.command('medium', handleMedium);
  }

  // Transcribe
  if (config.TRANSCRIBE_ENABLED) {
    bot.command('transcribe', handleTranscribe);
  }

  // Media extraction
  if (config.EXTRACT_ENABLED) {
    bot.command('extract', handleExtract);
  }

  // Callback query handler for inline keyboards
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('resume:')) {
      await handleResumeCallback(ctx);
    } else if (data.startsWith('provider:')) {
      await handleProviderCallback(ctx);
    } else if (data.startsWith('model:')) {
      await handleModelCallback(ctx);
    } else if (data.startsWith('mode:')) {
      await handleModeCallback(ctx);
    } else if (data.startsWith('terminalui:')) {
      await handleTerminalUICallback(ctx);
    } else if (data.startsWith('tts:')) {
      await handleTTSCallback(ctx);
    } else if (data.startsWith('telegraph:')) {
      await handleTelegraphCallback(ctx);
    } else if (data.startsWith('clear:')) {
      await handleClearCallback(ctx);
    } else if (data.startsWith('project:')) {
      await handleProjectCallback(ctx);
    } else if (data.startsWith('medium:')) {
      await handleMediumCallback(ctx);
    } else if (data.startsWith('extract:')) {
      await handleExtractCallback(ctx);
    } else if (data.startsWith('reddit_action:')) {
      await handleRedditActionCallback(ctx);
    } else if (data.startsWith('restart:')) {
      await handleRestartCallback(ctx);
    } else if (data.startsWith('reset:')) {
      await handleResetCallback(ctx);
    }
  });

  // Handle voice messages
  bot.on('message:voice', handleVoice);

  // Handle audio messages (music/audio files - separate from voice notes)
  bot.on('message:audio', handleTranscribeAudio);

  // Handle images
  bot.on('message:photo', handlePhoto);

  // Handle documents: check for audio transcribe ForceReply first, then image documents
  bot.on('message:document', async (ctx) => {
    // Try transcribe-document path first (audio MIME + reply to ForceReply)
    const replyTo = ctx.message?.reply_to_message;
    const doc = ctx.message?.document;
    if (replyTo && replyTo.from?.is_bot && doc?.mime_type?.startsWith('audio/')) {
      const replyText = (replyTo as { text?: string }).text || '';
      if (replyText.includes('Transcribe Audio')) {
        await handleTranscribeDocument(ctx);
        return;
      }
    }
    // Fall through to image document handler
    await handleImageDocument(ctx);
  });

  // Handle regular text messages
  bot.on('message:text', handleMessage);

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
}
