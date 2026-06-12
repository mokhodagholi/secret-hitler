import { resolve } from 'node:path';
import { buildServer } from './app';
import { DrizzleGameHistoryStore } from './history/DrizzleGameHistoryStore';

// Load the repo-root .env for dev. Anchored to this file (not cwd) so it works
// the same under `tsx` and the built `dist/`. Production may inject env directly.
try {
  process.loadEnvFile(resolve(__dirname, '../../.env'));
} catch {
  // No .env file — rely on the ambient environment.
}

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  // MIN_PLAYERS env lowers the start minimum for dev; unset = standard rules.
  const minPlayers = Number(process.env.MIN_PLAYERS) || undefined;

  // DATABASE_URL is required — the server does not run without persistence.
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Start Postgres (docker compose up -d), set it ' +
        'in .env (see .env.example), then run the migrations (pnpm --filter ' +
        '@secret-hitler/server db:migrate).',
    );
  }
  const history = DrizzleGameHistoryStore.fromUrl(databaseUrl);

  const { app } = await buildServer({ minPlayers, logger: true, history });

  app.log.info('Game history persistence enabled.');
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`WebSocket endpoint ready at ws://localhost:${PORT}/ws`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
