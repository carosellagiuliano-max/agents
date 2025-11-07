# Coding Standards &amp; Konventionen

## General
- Schreibe ausschliesslich TypeScript/TSX für App- und Library-Code.
- Verwende ESLint mit `eslint-config-next` und `@typescript-eslint` Regeln.
- Tests mit Vitest/Testing Library, Dateiendung `.test.ts(x)`.
- Eine Datei pro Domain-Concern, Export per Named Exports.

## Naming
- Dateien: `kebab-case` für Utils, `PascalCase` für React-Komponenten.
- Packages: `@schnittwerk/{bereich}` (z.B. `@schnittwerk/db`).
- Commits: Conventional Commits (`type(scope): message`).
- Branches: `feature/*`, `fix/*`, `chore/*`.

## Styling
- Tailwind für Layout/Style, eigene Komponenten in `packages/ui` kapseln.
- Keine Inline-Styles ausser für dynamische CSS Custom Properties.
- A11y: ARIA nur bei Bedarf, `aria-label` statt leeren Buttons, Fokus sichtbar.

## Reviews &amp; PRs
- Jeder PR referenziert Ticket/Issue, Checkliste im Template ausfüllen.
- Screenshots oder Videos bei UI-Änderungen.
- CI muss grün sein (lint, test, typecheck, build, migrations, policies, lighthouse).
