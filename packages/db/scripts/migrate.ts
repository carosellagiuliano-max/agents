import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabaseContext } from "./context";

async function main() {
  const context = await createDatabaseContext();
  const migrationsFolder = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../drizzle",
  );

  try {
    await migrate(context.db, { migrationsFolder });
    console.info(
      "[db] Migrations applied",
      JSON.stringify({
        connectionString: context.connectionString,
        ephemeral: context.isEphemeral,
      }),
    );
  } finally {
    await context.stop();
  }
}

main().catch((error) => {
  console.error("[db] Migration failed", error);
  process.exitCode = 1;
});
