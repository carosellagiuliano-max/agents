# Decisions Log

| Datum | Entscheidung | Kontext | Owner |
|-------|--------------|---------|-------|
| 2024-05-20 | Monorepo mit pnpm Workspaces | Konsolidierte Codebasis für Web, DB, UI und Payments, ermöglicht klare Verantwortlichkeiten und CI Automatisierung. | Lead Architect |
| 2024-05-20 | Next.js 14 App Router | Unterstützt Server Actions, Route Handler und Edge Rendering mit App Router Struktur. | Lead Architect |
| 2024-05-20 | Sentry als Observability Backbone | Einheitliches Error Tracking und Performance Monitoring gemäss Beobachtbarkeitsprinzip. | DevOps |
| 2024-05-21 | Drizzle ORM + SQL Migrationen für Supabase/Postgres | Einheitliches Domainmodell mit generierten SQL Migrationen, Seed-Daten und strikten RLS Policies; Tests laufen gegen Embedded Postgres, produktiv via `DATABASE_URL`. | Database and RLS |
| 2024-05-22 | Next.js Route-Handler für Booking-API + Zod Validation | Einheitliche REST-Schnittstellen (`/api/booking/*`) mit Idempotenz, RBAC Headern und konsistentem Fehlerkatalog für Frontend & Admin Integrationen. | Backend API |
| 2024-05-22 | Resend + ICS für Terminbestätigungen | Transaktionale E-Mails inkl. `text/calendar` Anhang, Double Opt-In Trigger bei Marketing Opt-In, Versand deaktivierbar ohne API-Key. | Security and Privacy |
| 2024-05-23 | Payment Adapter Registry mit SumUp/Stripe | Zwei Provider über gemeinsame Schnittstelle ermöglichen Failover, Idempotenz über Payment-ID, Tests simulieren HTTP-Flows; erfüllt Phase-3-Anforderung „SumUp Online Checkout + Stripe Fallback“. | Payments |
| 2024-05-23 | Upstash Redis als Payment Reconciliation Queue | Webhook-Ereignisse pushen Payment-IDs in `queue:payments:reconcile`, Cron-Hook `/api/payments/reconcile` stempelt `reconciled_at`; vermeidet blockierende Upstream-Calls und hält Infrastruktur minimal. | DevOps |
| 2024-05-23 | Schweizer Steuer- und Bargeldlogik in @schnittwerk/lib | Utility `accumulateOrderTotals` kalkuliert 8.1 %, 2.6 %, 3.8 % MwSt. plus 5-Rappen-Rundung, wird im Checkout sowie Cash-Reporting eingesetzt, Tests sichern Rundungslogik. | Backend API |
| 2024-05-24 | Adminportal mit CSV-Export & Audit Trail | `(admin)`-Layout mit Header-basierter RBAC, Kunden-/Inventur-Workflows inkl. CSV Export/Import, Audit-Logging über `recordAuditEvent`, Settings verwalten Öffnungszeiten und Rollen. | Admin and RBAC |
