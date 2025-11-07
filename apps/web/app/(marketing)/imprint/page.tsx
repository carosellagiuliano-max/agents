import { Heading } from '@schnittwerk/ui';

export const metadata = {
  title: 'Impressum',
  description: 'Rechtliche Angaben zu Schnittwerk by Vanessa Carosella gemäss Schweizer Recht.',
};

export default function ImprintPage() {
  return (
    <article className="space-y-6 text-sm text-slate-700">
      <Heading level={1}>Impressum</Heading>
      <section className="space-y-2">
        <Heading className="text-lg" level={2}>
          Angaben gemäss Art. 957 ff. OR
        </Heading>
        <p>
          Schnittwerk by Vanessa Carosella<br />
          Rorschacher Str. 152<br />
          9000 St. Gallen, Schweiz
        </p>
      </section>
      <section className="space-y-2">
        <Heading className="text-lg" level={2}>
          Kontakt
        </Heading>
        <p>
          Telefon: <a href="tel:+41791234567">+41 79 123 45 67</a>
          <br />E-Mail: <a href="mailto:hello@schnittwerk-vanessa.ch">hello@schnittwerk-vanessa.ch</a>
        </p>
      </section>
      <section className="space-y-2">
        <Heading className="text-lg" level={2}>
          Mehrwertsteuer-Nummer
        </Heading>
        <p>CHE-123.456.789 MWST (Beantragung läuft).</p>
      </section>
    </article>
  );
}
