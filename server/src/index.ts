import { resolve } from 'node:path';
import { parseFeatureFlags } from '@secret-hitler/shared';
import { buildServer } from './app';
import { DrizzleGameHistoryStore } from './history/DrizzleGameHistoryStore';
import { DrizzleProfileStore } from './profiles/DrizzleProfileStore';
import { DrizzleLiveRoomStore } from './rooms/DrizzleLiveRoomStore';
import { BaleSeatIndex } from './bale/BaleSeatIndex';
import { parseAdminUserIds } from './bale/adminIds';
import { registerBaleCommands, webhookListenUrl, type BaleRuntime } from './bale/webhook';
import { parseSupportChatId } from './bale/support';
import { connectDatabase } from './db/connection';
import { drizzleFolder, migrateDatabase } from './db/migrate';
import { iceServersFromEnv } from './voice/media';
import { MediasoupBackend } from './voice/MediasoupBackend';
import { VoiceHub } from './voice/VoiceHub';

// Load the repo-root .env for dev. Anchored to this file (not cwd) so it works
// the same under `tsx` and the built `dist/`. Production may inject env directly.
// `.env.example` fills keys a local `.env` omitted — Node does not overwrite.
const envDir = resolve(__dirname, '../..');
for (const name of ['.env', '.env.example']) {
  try {
    process.loadEnvFile(resolve(envDir, name));
  } catch {
    // Missing file — the other one, or the ambient environment, may still apply.
  }
}

const PORT = Number(process.env.PORT ?? 3001);

async function createBaleRuntime(): Promise<BaleRuntime | undefined> {
  const botToken = process.env.BALE_BOT_TOKEN?.trim();
  if (!botToken) return undefined;

  const { BaleBot } = await import('bale-bot');
  const bot = new BaleBot({ token: botToken });
  const webhookUrl = process.env.BALE_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.BALE_WEBHOOK_SECRET?.trim() || undefined;
  const botUsername = process.env.BALE_BOT_USERNAME?.trim() || '@secret_hitler_bot';
  const publicUrl = process.env.PUBLIC_URL?.trim() || undefined;

  if (webhookUrl) {
    // Bale's setWebhook only documents `url`. The secret lives in the path.
    await bot.setWebhook({ url: webhookListenUrl(webhookUrl, webhookSecret) });
  }
  await registerBaleCommands(bot);

  if (botToken && !webhookSecret) {
    console.warn('BALE_WEBHOOK_SECRET is empty; anyone can POST /api/bale/webhook');
  }

  const supportChatId = parseSupportChatId(process.env.BALE_SUPPORT_CHAT_ID);
  if (botToken && supportChatId == null) {
    console.warn('BALE_SUPPORT_CHAT_ID is empty; support letters cannot be delivered');
  }

  return {
    kind: 'bale',
    bot,
    botToken,
    publicUrl,
    botUsername,
    seats: new BaleSeatIndex(),
    webhookSecret,
    supportChatId,
  };
}

async function createTelegramRuntime(): Promise<BaleRuntime | undefined> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return undefined;

  const { BaleBot } = await import('bale-bot');
  const bot = new BaleBot({ token: botToken, baseUrl: 'https://api.telegram.org' });
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || undefined;
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim() || '@secret_hitler_bot';
  const webAppShortName = process.env.TELEGRAM_WEBAPP_SHORT_NAME?.trim() || 'game';
  const publicUrl = process.env.PUBLIC_URL?.trim() || undefined;

  if (webhookUrl) {
    await bot.setWebhook({
      url: webhookListenUrl(webhookUrl, webhookSecret),
      secret_token: webhookSecret,
    });
  }
  await registerBaleCommands(bot);

  if (!webhookSecret) {
    console.warn('TELEGRAM_WEBHOOK_SECRET is empty; anyone can POST /api/telegram/webhook');
  }

  const supportChatId = parseSupportChatId(process.env.TELEGRAM_SUPPORT_CHAT_ID);
  if (supportChatId == null) {
    console.warn('TELEGRAM_SUPPORT_CHAT_ID is empty; Telegram support letters cannot be delivered');
  }

  return {
    kind: 'telegram',
    bot,
    botToken,
    publicUrl,
    botUsername,
    webAppShortName,
    seats: new BaleSeatIndex(),
    webhookSecret,
    supportChatId,
  };
}

async function main() {
  // DATABASE_URL is required — the server does not run without persistence.
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Start Postgres (docker compose up -d), set it ' +
        'in .env (see .env.example), then run the migrations (pnpm --filter ' +
        '@secret-hitler/server db:migrate).',
    );
  }

  await migrateDatabase(databaseUrl, drizzleFolder(__dirname));
  const connection = connectDatabase(databaseUrl);
  const history = new DrizzleGameHistoryStore(connection);
  const profiles = new DrizzleProfileStore(connection);
  const live = new DrizzleLiveRoomStore(connection);
  const publicUrl = process.env.PUBLIC_URL?.trim() || undefined;
  const bale = await createBaleRuntime();
  const telegram = await createTelegramRuntime();

  let flags = parseFeatureFlags(process.env);
  let voice = null;
  if (flags.voice) {
    try {
      const announced = process.env.MEDIASOUP_ANNOUNCED_IP?.trim();
      const backend = await MediasoupBackend.create({
        listenIp: process.env.MEDIASOUP_LISTEN_IP?.trim() || '0.0.0.0',
        announcedIp: announced || undefined,
        rtcMinPort: Number(process.env.MEDIASOUP_RTC_MIN_PORT ?? 40000),
        rtcMaxPort: Number(process.env.MEDIASOUP_RTC_MAX_PORT ?? 40999),
      });
      voice = new VoiceHub(backend, iceServersFromEnv(process.env));
    } catch (err) {
      // Prefer a mute table over killing the lobby when the worker binary is missing.
      console.error(
        'FEATURE_VOICE is on but mediasoup failed to start; voice is off.',
        err,
      );
      flags = { ...flags, voice: false };
    }
  }

  const { app } = await buildServer({
    logger: true,
    history,
    profiles,
    live,
    publicUrl,
    bale,
    telegram,
    flags,
    voice,
    adminUserIds: parseAdminUserIds(),
  });

  app.log.info({ flags }, 'Feature flags');
  app.log.info('Game history and live-room persistence enabled.');
  if (bale) {
    app.log.info('Bale bot webhook ready.');
  }
  if (telegram) {
    app.log.info('Telegram bot webhook ready.');
  }
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`WebSocket endpoint ready at ws://localhost:${PORT}/ws`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
