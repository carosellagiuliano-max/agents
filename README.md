# Schnittwerk Digital Platform

Dieses Monorepo bündelt alle Artefakte für die Web-Plattform von **Schnittwerk by Vanessa Carosella**. Nach Phase 0 (Fundament) und Phase 1 (Datenbank + RLS) ist mit Phase 2 nun der komplette Terminfluss – von der Verfügbarkeitsberechnung über die Buchungs-API bis zu ICS-Mailouts und Adminkalender – implementiert.

## Struktur
- `apps/web` – Next.js 14 App Router inkl. Marketing-Routen, Health-Endpoints, Sentry-Setup.
- `packages/lib` – Infrastruktur-Helfer (z. B. strukturierte Logger).
- `packages/ui` – Gemeinsame UI-Komponenten auf Tailwind-Basis.
- `packages/db` – Platzhalter für Drizzle Schema, Migrationen, Seeds.
- `packages/payments` – Adapter-Registry für SumUp/Stripe mit Vitest-Suite.
- `docs` – Architektur, Security, Privacy, Runbook und Decisions.
- `.github/workflows` – CI mit Lint, Typecheck, Build, Tests, Migrationen, Policies, Lighthouse.

## Erste Schritte
```bash
pnpm install
pnpm dev --filter web
```

Weitere Befehle im Root `package.json` dokumentiert (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:migrate`, `pnpm policies:test`, `pnpm lighthouse`).

## Phasenstatus
- **Phase 0** – Architekturdiagramme, Health-/Ready-Endpoints, Sentry-Setup und CI-Pipeline stehen produktionsbereit.
- **Phase 1** – Vollständiges Drizzle-Schema mit Seeds, Exclusion-Constraint, RLS-Policies und Vitest-Abdeckung unter `packages/db`.
- **Phase 2** – Booking-API (`/api/booking/*`) mit Zod-Validierung und Idempotenz, Resend-gestützte Terminbestätigungen samt ICS, barrierefreie Buchungsstrecke im Frontend sowie ein Admin-Kalender (7-Tages-Ansicht) mit Rollen-Gate (`x-schnittwerk-roles`).
- **Phase 3** – Shop-Katalog & Warenkorb (SSR), Checkout mit Schweizer Steuerlogik, Payment-Adapter (SumUp/Stripe) inkl. Webhooks & Upstash-Reconciliation sowie PDF-Beleg-Endpunkt (`/api/orders/[id]/receipt`).
