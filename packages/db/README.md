# @schnittwerk/db

Phase 1 implementiert das produktionsnahe Postgres-Schema inklusive Drizzle Models, SQL-Migrationen, Seeds und RLS-Tests.

## Inhalte

- **Schema & Migrationen:** Alle Kernobjekte aus Phase 1 sind als Drizzle Tabellen und SQL Migration (`packages/db/drizzle/0001_initial.sql`) modelliert. Erweiterungen (`pgcrypto`, `btree_gist`) sowie RLS-Funktionen und Policies werden automatisch provisioniert.
- **Seeds:** `pnpm db:seed` befüllt eine konsistente Demo-Domain mit Rollen, Services, Terminen, Shopartikeln, Bestellungen und Einstellungen.
- **RLS Tests:** `pnpm policies:test` validiert Positiv-/Negativfälle (z. B. Terminüberschneidung, Rechte von Kund:innen, Stylist:innen und Admins) gegen eine echte Postgres-Instanz.
- **Skripte:** Alle Befehle erwarten eine gesetzte `DATABASE_URL` (z. B. lokale Postgres-Instanz oder Supabase Service Role).

## Nutzung

```bash
pnpm db:migrate  # Migrationen anwenden
pnpm db:seed     # Demo- und E2E-Daten laden
pnpm policies:test  # RLS- und Constraint-Tests via Vitest
```

Setze `DATABASE_URL` auf einen Postgres/Supabase-Endpoint (z. B. `postgresql://user:pass@localhost:5432/postgres`). Die Skripte respektieren `.env` und beenden Verbindungen sauber.
