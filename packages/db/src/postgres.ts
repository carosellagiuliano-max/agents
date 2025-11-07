import { Pool, PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export function createPool(config: PoolConfig = {}): Pool {
  return new Pool({
    max: 10,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
    ...config,
  });
}

export function createDrizzleClient(pool: Pool): Database {
  return drizzle(pool, {
    schema,
    logger: {
      logQuery(query, params) {
        if (process.env.DRIZZLE_DEBUG === "true") {
          console.debug("drizzle:query", { query, params });
        }
      },
    },
  });
}
