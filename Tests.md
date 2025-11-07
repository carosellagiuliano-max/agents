Projekt: Schnittwerk by Vanessa Carosella
Ort: Rorschacher Str. 152, 9000 St. Gallen (CH)
Ziel: Produktionsreife, auditierbare Test-Abdeckung über alle Kernflüsse (Website, Buchung, Shop, Admin, API, Datenschutz, Sicherheit, Performance, SEO)

🧭 Teststrategie

Testphilosophie

Jede Funktion, jedes Risiko, jede Pflicht (DSG/DSGVO, PBV, CH-Steuern) muss testbar und messbar sein.

Alle Tests laufen automatisiert über CI-Pipelines (.github/workflows/ci.yml).

Kein Merge ohne grüne Gates (Build, Lint, Typecheck, Tests, Lighthouse, Security).

Ergebnisse dokumentiert in /docs/QA_REPORTS/phase_[T0–T8]_YYYY-MM-DD.json.

Abdeckungskategorien

Funktional (Unit / Integration / E2E)

Sicherheit & Privacy

Performance & Core Web Vitals

Barrierefreiheit (WCAG 2.2 AA)

SEO & Compliance

Datenbank & RLS Policies

Infrastruktur & Monitoring

⚙️ Testphasen (T0–T8)
T0 – Fundament & Prozessqualität

Ziel: Saubere Basis, konsistente Konventionen, stabile CI.
Prüfungen

Lint, Typecheck, Unit Tests (Jest/Vitest)

Secretscan (Gitleaks)

Dependency-Audit (Snyk / npm audit)

Conventional Commits & Changelog

Keine TODOs im produktiven Pfad
Tools: pnpm lint | pnpm typecheck | pnpm test | pnpm ci:gitleaks
Gate: 100 % erfolgreich vor Phase 1

T1 – Database / RLS / Consistency

Ziel: Datenintegrität und Policy-Isolation.
Prüfungen

pgTAP-Suite (Schema, Keys, FKs, Exclusion Constraint)

RLS-Matrixtests (Positiv/Negativ je Rolle)

Drift-Check (Drizzle vs. Live Schema)

Transaction Fuzzer (100 parallele Bookings)
Tools: pgTAP | Drizzle | Node-pg + Jest
Gate: Keine Policy- oder Constraint-Fehler unter Last

T2 – API Verträge & Idempotenz

Ziel: Stabile Schnittstellen ohne Breaking Changes.
Prüfungen

OpenAPI-Spec gegen Implementierung (Dredd / Pact)

Idempotenz-Tests bei allen Mutationen (Key Header)

Sommerzeit-Edge-Cases (Europe/Zurich)
Gate: Jede Mutation mit gleichem Body + Key = identisches Resultat

T3 – E2E User Flows & Accessibility

Ziel: Nutzer kann Buchung, Storno, Checkout fehlerfrei durchlaufen.
Prüfungen

Playwright Flows (Buchung, Storno < 24 h, Verschieben, Zahlung, Refund)

A11y-Automatik (axe) + manueller Kurzcheck

Mobile Viewport-Tests (iPhone, Pixel, iPad)
Gate: 100 % grüne E2E Suites und WCAG AA-konform

T4 – Payments / Taxes / Receipts

Ziel: Fehlerfreie Zahlungs- und Belegkette.
Prüfungen

Webhook-Signatur-Validierung (SumUp & Stripe)

Reconciliation-Job mit Replay & Out-of-Order Events

CH-Steuersätze 8.1 / 2.6 / 3.8 + Bargeldrundung

PDF-Golden-Tests (Pixel-Diff / Hash)
Gate: 0 Rundungsfehler, 100 % validierte Steuersätze

T5 – Admin / RBAC / Inventory

Ziel: Zugriffsrechte und Datenrevision korrekt.
Prüfungen

RBAC-Matrix (UI + API) pro Rolle und Aktion

Inventur Import / Export, Negativbestände blockiert

DSG-konforme Exporte und Anonymisierung
Gate: Keine unberechtigten Zugriffe, keine Bestandsabweichung > 0 %

T6 – Security & Privacy

Ziel: Schutz gegen Angriffe und DSGVO-Konformität.
Prüfungen

Static AppSec (Semgrep), OWASP ZAP-Scan

HTTP-Header (CSP, HSTS, CSRF, X-Frame)

Rate-Limits (429 mit Retry-After)

Consent-Flows (Double Opt-In, Auskunft, Löschung)
Gate: 0 kritische Findings im ZAP Report

T7 – Performance / Web Vitals / SEO

Ziel: Schnelle Ladezeiten und Sichtbarkeit.
Prüfungen

Lighthouse Budgets (LCP < 2.5 s, CLS < 0.1, INP < 200 ms)

Bundle-Size Limit mit size-limit

Bild-Optimierung (WebP / AVIF / Lazy)

SEO (JSON-LD, Sitemap, robots, Unique Meta)
Gate: Keine Lighthouse-Scores < 90 / 100

T8 – Operations / Monitoring / Resilience

Ziel: Vorhersagbarer Betrieb und schnelles Recovery.
Prüfungen

Sentry Release mit Sourcemaps + Fehlerprobe

Health/Ready Endpoints unter Störung getestet

Backup-Restore-Drill auf Ephemeral DB

Rollback-Probe bei fehlerhafter Migration
Gate: System wiederherstellbar < 10 min bei Simulationsfehlern

🧩 API-Abdeckung (Tests → Endpoints)
Bereich	Beispiel-Endpoints	Testphasen
Health	/api/health, /api/ready	T8
Auth	/api/auth/login, /api/me	T2 / T3 / T6
Booking	/api/booking/availability, /api/booking/create, /api/booking/cancel	T1 / T2 / T3 / T6
Services & Staff	/api/services, /api/staff	T2 / T3
Orders & Payments	/api/checkout, /api/webhooks/stripe, /api/webhooks/sumup	T4 / T6
Admin & RBAC	/api/admin/* (Customer, Stock, Settings)	T5 / T6
Analytics & SEO	/api/admin/analytics, sitemap.xml, robots.txt	T7
Consent & Privacy	/api/consent	T6
🔐 Fehlerkatalog-Validierung
Code	Bedeutung	Erwarteter Testpfad
400	Validation failed (Zod)	T2
401	Unauthorized	T5 / T6
403	Forbidden (RBAC/RLS)	T1 / T5
404	Not found	T2
409	Business Rule Conflict	T3
422	Domain Error	T3
429	Rate Limit	T6
500	Unexpected	T8 (Sentry Probe)
📦 CI / Automation Mapping
Phase	Job-Name	pnpm-Command
T0	ci:lint / ci:typecheck / ci:unit	pnpm lint && pnpm typecheck && pnpm test
T1	db:pgTAP / db:rls	pnpm test:db
T2	api:contract / api:idempotency	pnpm test:api
T3	e2e:booking / e2e:a11y	pnpm test:e2e
T4	pay:recon / pay:vat	pnpm test:payments
T5	rbac:matrix / stock:consistency	pnpm test:admin
T6	sec:zap / privacy:flows	pnpm test:security
T7	perf:lighthouse / seo:richresults	pnpm test:perf
T8	ops:backup / ops:rollback	pnpm test:ops
🧾 Abnahmekriterien

Alle Gates grün (T0 – T8)

RLS Policy-Abdeckung ≥ 95 %

E2E Success Rate ≥ 98 %

Lighthouse Score ≥ 90 %

Zero Critical Findings (Snyk / ZAP)

Recovery Zeit < 10 min

Abnahmeprotokoll wird mit PR-Kommentar

“QA Phase T[X] approved”
signiert. Erst danach Merge und Phase-Wechsel.

🧠 Erweiterbar

Neue Tests werden nach identischem Schema ergänzt:

### TX – Titel
Ziel:
Prüfungen:
Tools:
Gate:


Alle neuen Jobs müssen in CI registriert und versioniert werden.
