# Runbook – Betrieb &amp; Notfall

## Monitoring &amp; Observability
- Sentry für Error &amp; Performance Monitoring (Frontend + API).
- Plausible/Matomo für Traffic, ohne personenbezogene Rohdaten.
- Structured Logging (JSON) nach GCP Logging Schema, angereichert mit `request_id`.

## Deployment Pipeline
1. Feature Branch → Pull Request (Template nutzen, CI muss grün sein).
2. Merge in `main` löst Build &amp; Preview Deploy bei Vercel aus.
3. Tagging erstellt Production Release mit Sentry Sourcemaps.

## Incident Response
- Pager: on-call Rotation im Team, Erreichbarkeit via Slack &amp; Telefon.
- Erstreaktion &lt; 15 Minuten, Incident Commander bestimmt Kommunikationskanal.
- Rollback via Vercel Deployment History oder DB Point-in-Time Restore.

## Backup &amp; Restore
- Supabase PITR aktivieren (min. 14 Tage).
- Redis Snapshot alle 12h.
- Offsite Backup der Konfigurations- und Dokumentationsdateien.

## Wartung
- Monatlicher Patchday (Node, pnpm, Dependencies).
- Security Review vor jedem Major Release.
- Testdaten regelmässig zurücksetzen.

## Datenbankoperationen
- **Migrationen:** `pnpm db:migrate` – nutzt `DATABASE_URL`, fällt sonst auf Embedded Postgres zurück (nur für lokale Tests).
- **Seeding:** `pnpm db:seed` – schreibt deterministische Demo-Daten; in Staging nach Rollbacks erneut ausführen.
- **RLS-Checks:** `pnpm policies:test` – führt Vitest-Suite mit Positiv-/Negativfällen aus und validiert Exclusion Constraints.
- **Notfall:** Bei manuellen Fixes immer via Service-Role Account mit Audit-Log-Eintrag (`audit_log` Tabelle) arbeiten.

## Terminbuchung (Phase 2)
- **Verfügbarkeit & Buchung:** Route Handler unter `/api/booking` erwarten JSON (`create`, `cancel`, `reschedule-request`) bzw. Query-Parameter (`availability`). Responses enthalten konsistente Fehlerobjekte.
- **RBAC-Header:** Für interne Operationen Header `x-schnittwerk-roles` setzen. Admin-UI erwartet `admin`, `manager` oder `reception`. Ohne Header gelten Requests als `anonymous`.
- **Idempotenz:** `booking:create` benötigt `idempotencyKey`. Wiederholte Requests mit gleichem Schlüssel liefern bestehende Termin-ID.
- **Storno-Fenster:** `booking.cancellation_window_hours` (Standard 24 h) wird bei `cancel` geprüft. Rollen mit Override (`admin`, `manager`, `reception`) dürfen trotzdem stornieren.
- **E-Mails & ICS:** Resend aktiviert sich über `RESEND_API_KEY`. Fehlt der Key, werden Notifications in der DB markiert, der Versand wird geloggt.
- **Double Opt-In:** Checkbox im Frontend schreibt Pending-Notification (`newsletter-double-opt-in`). Versand durch nachgelagerten Worker erledigen.

## Admin-Kalender
- **Pfad:** `/admin/appointments` (Gruppe `(admin)`), liest kommende 7 Tage direkt aus Postgres.
- **Security:** Zugriff nur bei gesetztem `x-schnittwerk-roles` Header mit mindestens einer erlaubten Rolle (`admin`, `manager`, `reception`).
- **Statusbadges:** Anzeigen berücksichtigen nur aktive Termine (`status` ≠ `cancelled`/`no_show`).

## Adminportal & Inventur (Phase 4)
- **RBAC Header:** Alle Admin-Views erwarten `x-schnittwerk-roles`. Für Stylist:innen zusätzlich `x-schnittwerk-staff-id`, sonst bleibt der Kalender leer.
- **Kund:innenverwaltung:** `/admin/customers` erlaubt Opt-In Umschaltung und DSG-konformes Löschen. CSV Export via `/api/admin/customers/export`, Response `text/csv` für Archiv.
- **Inventur:** `/admin/inventory` protokolliert jede Bestandsänderung in `stock_movements`. CSV Import (Form-Upload oder Textarea) akzeptiert `sku,quantity,reason,notes`. Fehler (unbekannte SKU) werden als Notice + Audit-Log ausgewiesen.
- **Einstellungen:** `/admin/settings` pflegt Buchungsschalter, Öffnungszeiten (Woche + Sondertage), Teamstatus und Rollen. Actions erzeugen Audit-Einträge (`update_booking_settings`, `update_opening_hours`, …). Rollenänderungen nur mit Rolle `owner` möglich.
- **Analytics:** `/admin/analytics` bietet Kennzahlen (Umsatz/Service, Orders/Kanal, No-Shows, Neukund:innen). Datenbasis: `orders`, `order_items`, `appointments`, `customers`. CSV-Export via `/api/admin/analytics/export` liefert dieselben Kennzahlen für Monatsreports.
- **Audit Log:** Tabelle `audit_log` enthält jede Adminaktion mit `action`, `changes`, `metadata`. Im Incident-Fall immer zuerst dort prüfen.

## Shop & Checkout (Phase 3)
- **Produktpflege:** Produkte & Varianten via DB (`products`, `product_variants`). Lagerstände (`stock_items`) aktualisieren, damit Shop-Verfügbarkeit stimmt; `stock_tracking=false` erlaubt Vorbestellungen.
- **Warenkorb:** Cookie `schnittwerk.cart` enthält Variant-IDs + Mengen. Server Action `clearCartAction` leert den Bestand (u. a. nach erfolgreicher Zahlung) – bei Supportfällen Cookie löschen lassen.
- **Checkout:** Server Action `submitCheckoutAction` erzeugt `orders` + `payments`. Fehler im Checkout geben `requestId` im Formular zurück, zur Nachverfolgung im Log suchen.
- **Steuer & Rundung:** Steuerbänder werden automatisch aus `products.tax_rate` abgeleitet (8.1 %, 2.6 %, 3.8 %). Bargeld-Rundung (`applySwissCashRounding`) wird nur für Reporting ausgewiesen, Zahlungen laufen in vollen Rappen.
- **Zahlungsprovider:**
  - **SumUp:** Client Credentials via `SUMUP_CLIENT_ID`/`SUMUP_CLIENT_SECRET`; Webhook `Authorization: Bearer <SUMUP_WEBHOOK_SECRET>`. Erfolgreiche Events (`PAID`) setzen Payment auf `captured` und order auf `paid`.
  - **Stripe:** PaymentIntent Webhooks signiert mit `STRIPE_WEBHOOK_SECRET`; `payment_intent.succeeded` → `captured`, `payment_intent.payment_failed` → `failed`. Fehlersignaturen liefern HTTP 400.
- **Reconciliation:** Webhooks enqueuen Payment-IDs in Upstash `queue:payments:reconcile`. Cron oder manueller Trigger ruft `POST /api/payments/reconcile` auf und stempelt `metadata.reconciled_at`. Bei Downstream-Ausfällen kann Queue manuell via Upstash UI entleert werden.
- **Quittungen:** Sofortige Erfolgspfade liefern `receiptUrl` zurück und zeigen Banner im Checkout. Für SumUp Redirects erfolgt Quittung nach Webhook-Bestätigung.
