import { Heading } from '@schnittwerk/ui';

const SERVICES = [
  {
    name: 'Signature Cut',
    duration: '60 Min',
    price: 'CHF 110.–',
    description: 'Individuell abgestimmter Haarschnitt mit Stylingberatung.',
  },
  {
    name: 'Color Balayage',
    duration: '150 Min',
    price: 'CHF 320.–',
    description: 'Freihand-Balayage inkl. Glossing und Pflegeritual.',
  },
  {
    name: 'Scalp Detox',
    duration: '45 Min',
    price: 'CHF 85.–',
    description: 'Botanisches Treatment zur Kopfhautberuhigung und Vitalisierung.',
  },
];

export const metadata = {
  title: 'Leistungen',
  description: 'Services und Packages von Schnittwerk – Styling, Color, Treatments und Events.',
};

export default function ServicesPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Heading level={1}>Unsere Leistungen</Heading>
        <p className="max-w-2xl text-slate-700">
          Personalisierte Services für Haar und Kopfhaut. Preise verstehen sich inkl. Beratung, Styling und hochwertigen
          Produkten.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        {SERVICES.map((service) => (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" key={service.name}>
            <Heading className="text-xl" level={2}>
              {service.name}
            </Heading>
            <p className="mt-2 text-sm text-slate-600">{service.description}</p>
            <dl className="mt-4 flex gap-6 text-sm text-slate-700">
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-500">Dauer</dt>
                <dd>{service.duration}</dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-500">Preis</dt>
                <dd>{service.price}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </div>
  );
}
