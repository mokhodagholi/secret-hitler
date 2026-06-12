import { defineConfig } from 'drizzle-kit';

// Generates and applies migrations for the game-history schema. Reads the same
// DATABASE_URL the server uses; see .env.example and docker-compose.yml.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://secret_hitler:secret_hitler@localhost:5432/secret_hitler',
  },
});
