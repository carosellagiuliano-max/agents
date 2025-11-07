import { createDrizzleClient, createPool } from '@schnittwerk/db';
import type { Database } from '@schnittwerk/db';

const globalForDb = globalThis as unknown as {
  __dbPool?: ReturnType<typeof createPool>;
  __dbClient?: Database;
};

export function getDatabase(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to access the database');
  }

  if (!globalForDb.__dbPool) {
    globalForDb.__dbPool = createPool({ connectionString });
  }

  if (!globalForDb.__dbClient) {
    globalForDb.__dbClient = createDrizzleClient(globalForDb.__dbPool);
  }

  return globalForDb.__dbClient;
}
