/**
 * Database Migration Runner
 * Applies all pending migrations to the database
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigrations() {
  console.log('🔄 Starting database migrations...');

  const client = postgres(connectionString!, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: './src/migrations' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
