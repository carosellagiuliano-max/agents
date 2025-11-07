import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { PoolClient } from "pg";
import format from "pg-format";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabaseContext } from "../scripts/context";
import { seedDatabase, seedIds } from "../src/seed";

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

type SessionConfig = {
  roles?: string[];
  userId?: string | null;
};

const ctxPromise = createDatabaseContext();

async function withSession<T>(config: SessionConfig, fn: (client: PoolClient) => Promise<T>) {
  const ctx = await ctxPromise;
  const client = await ctx.pool.connect();
  const roles = config.roles ?? [];
  const userId = config.userId ?? null;

  try {
    await client.query("reset all");
    await client.query("set role schnittwerk_rls");
    const rolesArray = roles.length ? `{${roles.join(',')}}` : "{}";
    await client.query(format("set session app.roles = %L", rolesArray));
    await client.query(format("set session app.user_id = %L", userId ?? ""));
    return await fn(client);
  } finally {
    client.release();
  }
}

describe("database policies", () => {
  beforeAll(async () => {
    const ctx = await ctxPromise;
    await migrate(ctx.db, { migrationsFolder });
    await seedDatabase(ctx.db);
  }, 120_000);

  afterAll(async () => {
    const ctx = await ctxPromise;
    await ctx.stop();
  });

  it("allows anonymous users to read active services", async () => {
    const rows = await withSession({ roles: [] }, async (client) => {
      const result = await client.query("select slug from services where is_active = true order by slug");
      return result.rows;
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.map((row) => row.slug)).toContain("signature-haarschnitt");
  });

  it("prevents customers from managing services", async () => {
    await expect(
      withSession({ roles: ["customer"], userId: seedIds.customerUserId }, async (client) => {
        await client.query(
          "insert into services (slug, name, duration_minutes, price_cents) values ($1, $2, $3, $4)",
          ["unauthorized-service", "Unauthorized", 30, 1000],
        );
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it("allows customers to see only their own appointments", async () => {
    const ownAppointments = await withSession(
      { roles: ["customer"], userId: seedIds.customerUserId },
      async (client) => {
        const { rows } = await client.query(
          "select id from appointments order by created_at",
        );
        return rows;
      },
    );

    expect(ownAppointments.length).toBe(1);
    expect(ownAppointments[0].id).toBe(seedIds.appointmentId);

    const otherAppointments = await withSession(
      { roles: ["customer"], userId: seedIds.customerUserId },
      async (client) => {
        const { rows } = await client.query(
          "select id from appointments where customer_id <> $1",
          [seedIds.customerUserId],
        );
        return rows;
      },
    );

    expect(otherAppointments).toHaveLength(0);
  });

  it("allows stylists to view assigned appointments but not stock movements", async () => {
    const appointmentRows = await withSession(
      { roles: ["stylist"], userId: seedIds.stylistUserId },
      async (client) => {
        const { rows } = await client.query(
          "select id from appointments where staff_id = app.current_staff_id()",
        );
        return rows;
      },
    );

    expect(appointmentRows.map((row) => row.id)).toContain(seedIds.appointmentId);

    await expect(
      withSession({ roles: ["stylist"], userId: seedIds.stylistUserId }, async (client) => {
        await client.query(
          "insert into stock_movements (variant_id, movement_type, quantity_change) values ($1, $2, $3)",
          [seedIds.productVariantId, "adjustment", -1],
        );
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it("allows managers to insert appointments but prevents overlapping slots", async () => {
    await withSession({ roles: ["manager"], userId: seedIds.adminUserId }, async (client) => {
      await client.query(
        "insert into appointments (customer_id, staff_id, service_id, status, slot, price_cents, currency) values ($1, $2, $3, 'confirmed', tstzrange($4, $5, '[)'), $6, 'CHF')",
        [
          seedIds.customerUserId,
          seedIds.stylistStaffId,
          seedIds.colorRefreshServiceId,
          "2024-05-01T08:15:00Z",
          "2024-05-01T09:15:00Z",
          18000,
        ],
      );
    });

    await expect(
      withSession({ roles: ["manager"], userId: seedIds.adminUserId }, async (client) => {
        await client.query(
          "insert into appointments (customer_id, staff_id, service_id, status, slot, price_cents, currency) values ($1, $2, $3, 'confirmed', tstzrange($4, $5, '[)'), $6, 'CHF')",
          [
            seedIds.customerUserId,
            seedIds.stylistStaffId,
            seedIds.haircutServiceId,
            "2024-05-01T07:30:00Z",
            "2024-05-01T08:30:00Z",
            12500,
          ],
        );
      }),
    ).rejects.toThrow(/conflict|overlap|constraint/i);
  });

  it("allows admins to manage settings", async () => {
    await withSession({ roles: ["admin"], userId: seedIds.adminUserId }, async (client) => {
      await client.query(
        "insert into settings (key, value, updated_by) values ($1, $2, $3) on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by",
        ["booking.reminder_hours", JSON.stringify({ sms: 3 }), seedIds.adminUserId],
      );
    });

    const settingsRow = await withSession({ roles: ["admin"], userId: seedIds.adminUserId }, async (client) => {
      const { rows } = await client.query("select value from settings where key = $1", [
        "booking.reminder_hours",
      ]);
      return rows[0];
    });

    expect(settingsRow.value).toEqual({ sms: 3 });
  });
});
