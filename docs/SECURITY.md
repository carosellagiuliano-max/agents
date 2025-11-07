# Sicherheitshandbuch

## Prinzipien
- Zero-Trust, minimale Berechtigungen, RLS für jede Tabelle.
- Secrets ausschliesslich über Environment Variablen, keine Default-Passwörter.
- CSP ohne `unsafe-inline`, HSTS für Produktions-Domains.
- Rate Limiting auf Auth, Buchungen, Payments; Bot- und DDoS-Schutz über Edge.

## Implementierte Baseline (Phase 0)
- Sentry Setup mit anonymisierten IPs und Release-Tags.
- Logging erfolgt strukturiert als JSON (`request_id`, `user_id`, `role`).
- Health-/Ready-Endpoints (`/api/health`, `/api/ready`) liefern nur Statusinformationen.

## Paymentsicherheit (Phase 3)
- **Payment Webhooks:**
  - SumUp: `Authorization: Bearer <SUMUP_WEBHOOK_SECRET>` wird auf Gleichheit geprüft. Fehlende/ungültige Header liefern 401.
  - Stripe: HMAC-SHA256 über `t.payload` mit `STRIPE_WEBHOOK_SECRET`, Validierung via `timingSafeEqual`.
- **Adapter Secrets:** `SUMUP_CLIENT_ID`, `SUMUP_CLIENT_SECRET`, `STRIPE_SECRET_KEY` nur im Secret Store; lokale Entwicklung via `.env.local`.
- **Upstash Queue:** `UPSTASH_REDIS_TOKEN` besitzt nur `lpush/lpop` Rechte. Fehlende Konfiguration führt zu no-op ohne Klartext-Token im Code.
- **Request IDs:** Checkout & Payment Actions erzeugen `requestId` (UUID) für Nachverfolgung in Logs, Webhooks setzen denselben Logging-Kontext.

## Schutzmassnahmen Phase 5
- **Security Headers:** Middleware erzeugt pro Request eine Nonce und setzt strikte Headers (CSP mit Nonce, Referrer-Policy, COOP/COEP, CORP, X-Frame-Options, HSTS 2 Jahre, Permissions-Policy, DNS-Prefetch-Control).
- **CSRF-Schutz:** `ensureCsrfToken` vergibt 12h-gültige SameSite=Strict Cookies (`schnittwerk.csrf`) und fordert den gleichen Wert im Header `x-csrf-token` an. Tokens werden mittels `timingSafeEqual` verglichen.
- **Rate Limiting:** Upstash Sliding Window (5 Anfragen / 10 min) auf Buchungs-Mutationen für öffentliche Rollen. Admin-Rollen sind ausgenommen.
- **Captcha:** Cloudflare Turnstile schützt die öffentliche Buchung. Token wird clientseitig via `react-turnstile` eingebettet, serverseitig verifiziert und Fehler werden geloggt.
- **Secrets:** Neue Variablen `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dokumentiert. Alle Secrets werden nur über Env bereitgestellt; fehlende Konfiguration führt zu sicheren Defaults (Captcha optional in Dev, Rate Limit deaktiviert ohne Upstash).
- **Observability:** Sentry erfasst Releases mit Sourcemaps, Logs bleiben strukturiert. Fehlgeschlagene Sicherheitsprüfungen werden über Logger kommuniziert.

## Betrieb & Automatisierung
- CI führt Linting, Typprüfung, Tests, Drizzle-Migrationen und Lighthouse-Budgets aus.
- Health-Checks werden von Monitoring (Sentry/Statuspage) überwacht.
- Security Alerts: fehlgeschlagene Captcha/Rate-Limits werden mit Request-ID geloggt.

## Penetrationstest-Checkliste
- [x] CSP-Header ohne `unsafe-inline` bestätigt (inkl. Nonce für App-Router-Inlines). Manuell mit `curl -I` gegen die lokale Middleware überprüft.
- [x] CSRF-Schutz überprüft: Token im Cookie und Header identisch, Ablehnung ohne Token. Negativtest über API-Request ohne Header führt zu 403.
- [x] Turnstile-Integration validiert (Token-Replay verhindert, Fehlerhandling vorhanden). Wiederverwendung eines Tokens resultiert in 400 und strukturiertem Log.
- [x] Rate-Limit unter Last getestet (5 Mutationen/10 min für öffentliche Rollen). Belastungstest erzeugt konsistent 429 nach dem fünften Request.
- [x] HSTS-Header via Qualys SSL Labs bestätigt. Ergebnis: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` aktiv.
- [x] Secrets im Deployment gegen `.env.example` abgeglichen, keine Defaults aktiv. Vergleich erfolgt automatisiert im Deployment-Runbook.
- [x] Webhooks (SumUp/Stripe) mit falschen Secrets testen ⇒ 401/400. Manuelle Requests mit fehlerhaften Signaturen werden abgelehnt.
