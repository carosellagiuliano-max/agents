# Datenschutzleitfaden

## Grundsätze
- Datenminimierung: nur zwingend notwendige Personendaten werden gespeichert.
- Zweckbindung: Termin-, Shop- und Kommunikationsdaten werden klar getrennt.
- Transparenz: Privacy Notice, Einwilligungen und Aufbewahrungsfristen dokumentieren.

## Datenflüsse
- **Kund:in → Web App:** personenbezogene Daten via TLS, Validierung client- &amp; serverseitig.
- **Web App → Supabase:** Speicherung mit RLS; Zugriff anhand Rollenclaims.
- **Web App → Resend:** Nur notwendige Felder (Name, Mail, Termin) werden übertragen.
- **Web App → Analytics:** Plausible/Matomo im Self-Hosted Modus, IP-Anonymisierung aktiv.
- **Web App → Payments:** SumUp (Checkout-ID, Betrag, Redirect) und Stripe (PaymentIntent, Betrag, Metadaten) erhalten ausschliesslich Bestell-ID, Betrag sowie Kund:innenname/E-Mail. Zugriff über deren Dashboards per MFA absichern.
- **Marketing Double Opt-In:** Opt-In Checkbox erzeugt Pending-Notification (`newsletter-double-opt-in`). Erst nach bestätigter Mail wird `marketing_opt_in` dauerhaft gesetzt.
- **Adminportal:** Kund:innenexporte (`/api/admin/customers/export`) liefern nur erforderliche Stammdaten (Name, Mail, Historie). Inventur-CSV enthält keine Personendaten. Analytics-Exports (`/api/admin/analytics/export`) bestehen ausschliesslich aus aggregierten Kennzahlen ohne Personenbezug.

## E-Mail-Inhalte &amp; Aufbewahrung
- Terminbestätigungen enthalten Service, Team, Slot-Zeiten, Salonadresse sowie ICS-Anhang (Europe/Zurich). Keine sensiblen Notizen im Klartext versenden.
- Notifications werden im `notifications`-Table protokolliert (Status, Payload, Empfänger) und unterliegen dem Aufbewahrungsplan.
- Resend Logfiles regelmäßig auf DSG-konforme Speicherfristen prüfen.

## Prozesse & Betroffenenrechte
- **Auskunft:** Support-Workflow `admin/customers` → Detailansicht → „Exportieren“. Generiert JSON &amp; CSV mit Termin-, Shop- und Einwilligungsdaten. Export wird protokolliert (`audit_log`). SLA: 10 Tage.
- **Berichtigung:** Admin-UI erlaubt Stammdatenänderung mit Audit-Log. Jede Mutation erfasst `request_id`, `actor_id`.
- **Löschung:** Kundenprofil > „Löschen“ setzt Soft-Delete, sperrt Termin-/Order-Relationen und triggert Anonymisierung nach 30 Tagen (Hinterlegung in `customers.pending_erasure_at`). Zahlungsdaten bleiben bis Ablauf handelsrechtlicher Aufbewahrungsfristen gesperrt.
- **Datenportabilität:** Export liefert strukturierte CSV/JSON; ICS für Termine bleibt abrufbar.
- **Beschwerdeverfahren:** Ticket in Helpdesk, Reaktion ≤48h, Dokumentation in `privacy_cases` (separates Sheet).

## Consent- und Einwilligungs-Logging
- Consent-Events werden im Table `consent_log` gespeichert (kund_id, zweck, status, timestamp, source_ip, request_id).
- Double-Opt-In E-Mails verlinken auf `/newsletter/confirm?token=...`, Token mit HMAC signiert, 48h gültig.
- Widerruf möglich via Profil oder Link in Mail. Nach Widerruf wird Marketing-Flag deaktiviert und Timestamp gespeichert.

## Aufbewahrungsfristen
- Kundendaten: aktive Kunden bis 24 Monate nach letztem Besuch, danach Pseudonymisierung (Name/Email → Hash, Historie aggregiert).
- Termin-Events &amp; Audit-Log: 10 Jahre (gesetzliche Nachweispflicht bei Streitfällen) → Archivierung in verschlüsseltem S3-Bucket.
- Zahlungsbelege: 10 Jahre (OR Art. 958f). Zugriff nur via berechtigte Rollen.
- Newsletter-Logs: 2 Jahre, anschliessend Aggregation.
- Health-/Access-Logs: 90 Tage Rolling Window.

## Auftragsverarbeitung &amp; DPA-Status
- **Supabase (Postgres &amp; Auth):** AV-Vertrag &amp; EU-DSGVO Standardvertragsklauseln abgeschlossen, Rechenzentrum EU.
- **Resend (Mail):** DPA unterschrieben, Datenhaltung USA mit SCC. Marketing-Inhalte nur nach Opt-In.
- **SumUp / Stripe:** DPA aktiv, 2FA für Dashboard verpflichtend. Terminal-IDs hinterlegt.
- **Plausible/Matomo:** Self-hosted in CH/EU. IP-Anonymisierung und Do-Not-Track Respekt aktiv.
- **Upstash (Rate-Limit/Queue):** DPA abgeschlossen, Redis-Daten enthalten nur Hashes/IDs.
- **Cloudflare Turnstile:** DPA akzeptiert, keine Cookies; Token enthalten keine personenbezogenen Daten.

## Governance &amp; Reviews
- Privacy Review im Sprint-Review: Checkliste (Consent, Datenflüsse, Export/Löschungen) dokumentiert im Notion-Space.
- Jährliche Schulung für Admin-Team: DSG, DSGVO, Meldepflichten.
- Notfallplan Datenpanne: Incident-Channel in Slack, Meldung an FDPIC innerhalb 72h, Kundenbenachrichtigung per Template.
