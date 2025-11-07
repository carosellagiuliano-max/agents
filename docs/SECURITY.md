# Sicherheitshandbuch

## Prinzipien
- Zero-Trust, minimale Berechtigungen, RLS für jede Tabelle.
- Secrets ausschliesslich über Environment Variablen, keine Default-Passwörter.
- CSP ohne `unsafe-inline`, HSTS für Production Domains.
- Rate Limiting auf Auth, Buchungen, Payments; Bot- und DDoS-Schutz über Edge.

## Pflichtenheft Phase 0
- Sentry Setup vorbereitet mit anonymisierten IPs.
- Logging erfolgt strukturiert mit `request_id`, `user_id`, `role`.
- Health-/Ready-Endpoints geben nur minimalistische Informationen preis.

## Nächste Schritte
- Implementierung von CSRF-Schutz via SameSite=strict Cookies.
- Automatisierte Security Tests in CI (npm audit, dependency review).
- Penetrationstest-Checkliste für Phase 5 vorbereiten.

## Phase 3 Sicherheit
- **Payment Webhooks:**
  - SumUp: `Authorization: Bearer <SUMUP_WEBHOOK_SECRET>` wird auf Gleichheit geprüft. Fehlende/ungültige Header liefern 401.
  - Stripe: HMAC-SHA256 über `t.payload` mit `STRIPE_WEBHOOK_SECRET`, Validierung via `timingSafeEqual`.
- **Adapter Secrets:** `SUMUP_CLIENT_ID`, `SUMUP_CLIENT_SECRET`, `STRIPE_SECRET_KEY` nur im Secret Store hinterlegt; lokale Entwicklung via `.env.local`.
- **Upstash Queue:** `UPSTASH_REDIS_TOKEN` besitzt nur `lpush/lpop` Rechte. Fehlende Konfig führt zu silent no-op, kein Klartext-Token im Code.
- **Request IDs:** Checkout & Payment Actions erzeugen `requestId` (UUID) für Nachverfolgung in Logs, Webhooks setzen ebenfalls Logging-Kontext.
