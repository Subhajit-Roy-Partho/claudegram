import { run } from '@grammyjs/runner';
import { createBot } from './bot/bot.js';
import { config } from './config.js';
import { preventSleep, allowSleep } from './utils/caffeinate.js';
import { stopCleanup } from './telegram/deduplication.js';

const RETRY_409_DELAYS_MS = [5_000, 10_000, 20_000, 30_000];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🤖 Starting Claudegram...');
  console.log(`📋 Allowed users: ${config.ALLOWED_USER_IDS.join(', ')}`);
  console.log(`📝 Mode: ${config.STREAMING_MODE}`);

  // Prevent system sleep on macOS
  preventSleep();

  const bot = await createBot();

  // Initialize bot (fetches bot info from Telegram)
  await bot.init();
  console.log(`✅ Bot started as @${bot.botInfo.username}`);
  console.log('📱 Send /start in Telegram to begin');

  let attempt = 0;
  let activeRunner: ReturnType<typeof run> | undefined;
  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n👋 Shutting down...');
    allowSleep();
    stopCleanup();
    await activeRunner?.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => { shutdown(); });
  process.on('SIGTERM', () => { shutdown(); });

  while (true) {
    // Start concurrent runner — updates are processed in parallel,
    // with per-chat ordering enforced by the sequentialize middleware in bot.ts.
    // This lets /cancel bypass the per-chat queue and interrupt running queries.
    const runner = run(bot);
    activeRunner = runner;

    try {
      // Keep alive until the runner stops (crash or explicit stop)
      await runner.task();
      break; // clean exit (shutdown signal)
    } catch (error: unknown) {
      const is409 = error instanceof Error &&
        (error.message.includes('409') || error.message.includes('Conflict'));

      if (is409 && attempt < RETRY_409_DELAYS_MS.length) {
        const delay = RETRY_409_DELAYS_MS[attempt++];
        console.error(`[409] Another instance is running — retrying in ${delay / 1000}s...`);
        await runner.stop();
        if (activeRunner === runner) {
          activeRunner = undefined;
        }
        await sleep(delay);
        continue;
      }

      console.error('Fatal error:', error);
      allowSleep();
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  allowSleep();
  process.exit(1);
});
