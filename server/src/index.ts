import Fastify from 'fastify';
import { SHARED_VERSION } from '@secret-hitler/shared';

const server = Fastify({ logger: true });

server.get('/health', async () => ({
  status: 'ok',
  shared: SHARED_VERSION,
}));

server.listen({ port: 3001, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
