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

## Offene Aufgaben
- Consent Log Schema definieren (Phase 1/2).
- Auftragsverarbeitungsverträge für SumUp, Stripe, Resend, Plausible.
