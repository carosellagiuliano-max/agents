import Image from 'next/image';
import { Heading } from '@schnittwerk/ui';

export const metadata = {
  title: 'Über uns',
  description: 'Team, Philosophie und Nachhaltigkeitsversprechen von Schnittwerk by Vanessa Carosella.',
};

export default function AboutPage() {
  return (
    <article className="grid gap-10 lg:grid-cols-[2fr,1fr] lg:items-start">
      <section className="space-y-6">
        <Heading level={1}>Hairstyling mit Charakter</Heading>
        <p className="text-lg text-slate-700">
          Vanessa Carosella und ihr Team kombinieren Couture-inspirierte Techniken mit Schweizer Präzision. Wir glauben an
          persönliche Beziehungen, Transparenz und nachhaltige Schönheit.
        </p>
        <Heading className="text-xl" level={2}>
          Unser Versprechen
        </Heading>
        <ul className="space-y-3 text-sm text-slate-700">
          <li>✓ Faire Beratung statt Upselling – die Bedürfnisse der Kund:innen stehen an erster Stelle.</li>
          <li>✓ Energie aus Schweizer Wasserkraft und klimafreundliche Salonprozesse.</li>
          <li>✓ Transparente Preisgestaltung gemäss Preisbekanntgabeverordnung.</li>
        </ul>
      </section>
      <aside className="space-y-4 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <Heading className="text-xl" level={2}>
          Team &amp; Space
        </Heading>
        <Image
          alt="Salonansicht mit Stylingplätzen"
          className="h-auto w-full rounded-2xl object-cover"
          height={320}
          src="/images/salon-placeholder.svg"
          width={480}
        />
        <p className="text-sm text-slate-600">
          Wir gestalten den Raum laufend um. Ein digitales Moodboard dokumentiert Farben, Materialien und Sitzbereiche für das
          anstehende Redesign.
        </p>
      </aside>
    </article>
  );
}
