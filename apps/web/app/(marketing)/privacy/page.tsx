import { Heading } from '@schnittwerk/ui';

export const metadata = {
  title: 'Datenschutz',
  description: 'Informationen zur Datenbearbeitung bei Schnittwerk by Vanessa Carosella gemäss DSG/DSGVO.',
};

export default function PrivacyPage() {
  return (
    <article className="space-y-6 text-sm text-slate-700">
      <Heading level={1}>Datenschutzerklärung</Heading>
      <p>
        Diese Vorab-Version der Datenschutzerklärung beschreibt die wichtigsten Prinzipien. Die finale Version folgt mit dem
        Go-Live der produktiven Plattform.
      </p>
      <section className="space-y-3">
        <Heading className="text-lg" level={2}>
          Verantwortliche Stelle
        </Heading>
        <p>
          Schnittwerk by Vanessa Carosella<br />
          Rorschacher Str. 152<br />
          9000 St. Gallen, Schweiz
        </p>
      </section>
      <section className="space-y-3">
        <Heading className="text-lg" level={2}>
          Kategorien von Personendaten
        </Heading>
        <ul className="list-disc space-y-1 pl-5">
          <li>Kontakt- und Profildaten (Name, E-Mail, Telefonnummer)</li>
          <li>Termin- und Bestellhistorie</li>
          <li>Zahlungsstatus (keine vollständigen Kartendaten)</li>
          <li>Kommunikationsprotokolle (E-Mail, Benachrichtigungen)</li>
        </ul>
      </section>
      <section className="space-y-3">
        <Heading className="text-lg" level={2}>
          Rechte der betroffenen Personen
        </Heading>
        <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenportabilität und Widerspruch.</p>
      </section>
    </article>
  );
}
