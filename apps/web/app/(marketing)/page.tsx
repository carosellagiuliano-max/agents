import Link from 'next/link';
import { Heading } from '@schnittwerk/ui';

const HIGHLIGHTS = [
  {
    title: 'Signature Cuts',
    description: 'Präzisionshaarschnitte, die Gesichtszüge und Persönlichkeit unterstreichen.',
  },
  {
    title: 'Color Couture',
    description: 'Balayage, Glossing und Farbkorrekturen mit Premium-Produkten.',
  },
  {
    title: 'Green Beauty',
    description: 'Vegane Stylingprodukte und ressourcenschonende Services.',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <Heading level={1}>Schnittwerk by Vanessa Carosella</Heading>
          <p className="text-lg text-slate-700">
            Premium Hairstyling im Herzen von St. Gallen. Massgeschneiderte Looks, nachhaltige Produkte und eine persönliche
            Beratung in entspannter Atmosphäre.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-slate-700"
              href="/booking"
            >
              Termin buchen
            </Link>
            <Link className="inline-flex items-center rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold" href="/services">
              Leistungen entdecken
            </Link>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
          <Heading className="mb-4 text-xl" level={2}>
            Highlights
          </Heading>
          <ul className="space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li className="rounded-2xl border border-slate-200 p-4" key={item.title}>
                <Heading className="text-lg" level={3}>
                  {item.title}
                </Heading>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-8 rounded-3xl bg-slate-900 p-8 text-white lg:grid-cols-3">
        <Heading className="lg:col-span-3" level={2}>
          Warum Schnittwerk?
        </Heading>
        <p>Personalisierte Beratung, moderne Farbtechniken und nachhaltige Produktlinien.</p>
        <p>Digitale Terminverwaltung mit Erinnerungen, Wartelisten und kontaktlosen Zahlungen.</p>
        <p>Community Events, Workshops und exklusive Produktlaunches.</p>
      </section>
    </div>
  );
}
