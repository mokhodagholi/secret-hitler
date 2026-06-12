import { buildServer } from './app';

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  // MIN_PLAYERS env lowers the start minimum for dev; unset = standard rules.
  const minPlayers = Number(process.env.MIN_PLAYERS) || undefined;
  const { app } = await buildServer({ minPlayers, logger: true });

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`WebSocket endpoint ready at ws://localhost:${PORT}/ws`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
