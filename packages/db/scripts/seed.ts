import { createDatabaseContext } from "./context";
import { seedDatabase } from "../src/seed";

async function main() {
  const context = await createDatabaseContext();

  try {
    await seedDatabase(context.db);
    console.info(
      "[db] Seed data loaded",
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
  console.error("[db] Seeding failed", error);
  process.exitCode = 1;
});
