import { resolve } from 'node:path';
import { buildServer } from './app';
import { DrizzleGameHistoryStore } from './history/DrizzleGameHistoryStore';
import { DrizzleProfileStore } from './profiles/DrizzleProfileStore';
import { BaleSeatIndex } from './bale/BaleSeatIndex';
import { registerBaleCommands, type BaleRuntime } from './bale/webhook';
import { drizzleFolder, migrateDatabase } from './db/migrate';

// Load the repo-root .env for dev. Anchored to this file (not cwd) so it works
// the same under `tsx` and the built `dist/`. Production may inject env directly.
try {
  process.loadEnvFile(resolve(__dirname, '../../.env'));
} catch {
  // No .env file — rely on the ambient environment.
}

const PORT = Number(process.env.PORT ?? 3001);

async function createBaleRuntime(): Promise<BaleRuntime | undefined> {
  const botToken = process.env.BALE_BOT_TOKEN?.trim();
  if (!botToken) return undefined;

  const { BaleBot } = await import('bale-bot');
  const bot = new BaleBot({ token: botToken });
  const webhookUrl = process.env.BALE_WEBHOOK_URL?.trim();
  const botUsername = process.env.BALE_BOT_USERNAME?.trim() || '@secret_hitler_bot';
  const publicUrl = process.env.PUBLIC_URL?.trim() || undefined;

  if (webhookUrl) {
    await bot.setWebhook({ url: webhookUrl });
  }
  await registerBaleCommands(bot);

  return {
    bot,
    botToken,
    publicUrl,
    botUsername,
    seats: new BaleSeatIndex(),
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
  const history = DrizzleGameHistoryStore.fromUrl(databaseUrl);
  const profiles = DrizzleProfileStore.fromUrl(databaseUrl);
  const publicUrl = process.env.PUBLIC_URL?.trim() || undefined;
  const bale = await createBaleRuntime();

  const { app } = await buildServer({ logger: true, history, profiles, publicUrl, bale });

  app.log.info('Game history persistence enabled.');
  if (bale) {
    app.log.info('Bale bot webhook ready.');
  }
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`WebSocket endpoint ready at ws://localhost:${PORT}/ws`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
