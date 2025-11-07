import "dotenv/config";
import { createDrizzleClient, createPool } from "../src/postgres";
import type { Database } from "../src/postgres";
import type { Pool } from "pg";

export interface DatabaseContext {
  db: Database;
  pool: Pool;
  connectionString: string;
  isEphemeral: boolean;
  stop: () => Promise<void>;
}

export async function createDatabaseContext(): Promise<DatabaseContext> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required to run database tasks. Point it at your Postgres/Supabase instance.",
    );
  }

  const pool = createPool({ connectionString });
  const db = createDrizzleClient(pool);

  return {
    db,
    pool,
    connectionString,
    isEphemeral: false,
    stop: async () => {
      await pool.end();
    },
  };
}
