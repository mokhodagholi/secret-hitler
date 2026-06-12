import { buildServer } from './app';
import { DrizzleGameHistoryStore } from './history/DrizzleGameHistoryStore';

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  // MIN_PLAYERS env lowers the start minimum for dev; unset = standard rules.
  const minPlayers = Number(process.env.MIN_PLAYERS) || undefined;
  // DATABASE_URL is optional: without it the game runs, just unpersisted.
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const history = databaseUrl
    ? DrizzleGameHistoryStore.fromUrl(databaseUrl)
    : undefined;

  const { app } = await buildServer({ minPlayers, logger: true, history });

  app.log.info(
    history ? 'Game history persistence enabled.' : 'No DATABASE_URL — games are not persisted.',
  );
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`WebSocket endpoint ready at ws://localhost:${PORT}/ws`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
