import { Heading } from '@schnittwerk/ui';

export const metadata = {
  title: 'Projekt-Tagebuch',
  description: 'Transparente Updates zum digitalen Ausbau von Schnittwerk by Vanessa Carosella.',
};

export default function UpdatesPage() {
  return (
    <div className="space-y-6">
      <Heading level={1}>Projekt-Tagebuch</Heading>
      <p className="text-slate-700">
        Wir dokumentieren jede Phase des Digitalprojekts offen. Release-Notes, Entscheidungslogs und Screenshots werden hier
        gebündelt. Ab Phase 1 folgen technische Changelogs, QA-Berichte und Lighthouse-Snapshots.
      </p>
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
        <p className="font-semibold uppercase tracking-wide text-slate-500">Letztes Update</p>
        <p className="mt-2">Phase 0 – Architektur &amp; Fundament eingerichtet (20.05.2024)</p>
      </div>
    </div>
  );
}
