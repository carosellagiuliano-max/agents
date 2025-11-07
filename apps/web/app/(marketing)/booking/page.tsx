import type { Metadata } from 'next';

import { Heading } from '@schnittwerk/ui';
import { schema } from '@schnittwerk/db';

import BookingForm, { ServiceOption, StaffOption } from '../../../components/booking/BookingForm';
import { getDatabase } from '../../../lib/db';
import { ensureCsrfToken } from '../../../lib/security/csrf';

export const metadata: Metadata = {
  title: 'Termin buchen',
  description:
    'Buche deinen Termin bei Schnittwerk by Vanessa Carosella direkt online. Alle Services, verfügbaren Slots und Erinnerungen in einem Flow.',
};

async function loadBookingData(): Promise<{ services: ServiceOption[]; staff: StaffOption[] }> {
  if (!process.env.DATABASE_URL) {
    return { services: [], staff: [] };
  }

  try {
    const db = getDatabase();

    const services = await db
      .select({
        id: schema.services.id,
        name: schema.services.name,
        description: schema.services.description,
        durationMinutes: schema.services.durationMinutes,
        priceCents: schema.services.priceCents,
        isOnlineBookable: schema.services.isOnlineBookable,
      })
      .from(schema.services);

    const onlineServices = services.filter((service) => service.isOnlineBookable);
    const serviceIds = new Set(onlineServices.map((service) => service.id));

    const staffMembers = (await db
      .select({
        id: schema.staff.id,
        name: schema.staff.displayName,
        colorHex: schema.staff.colorHex,
        isActive: schema.staff.isActive,
      })
      .from(schema.staff)).filter((member) => member.isActive);

    const staffServices = await db
      .select({
        staffId: schema.staffServices.staffId,
        serviceId: schema.staffServices.serviceId,
      })
      .from(schema.staffServices);

    const staffOptions: StaffOption[] = staffMembers
      .map((member) => {
        const serviceIdsForStaff = staffServices
          .filter((row) => row.staffId === member.id && serviceIds.has(row.serviceId))
          .map((row) => row.serviceId);
        return {
          id: member.id,
          name: member.name,
          colorHex: member.colorHex,
          serviceIds: serviceIdsForStaff,
        } satisfies StaffOption;
      })
      .filter((member) => member.serviceIds.length > 0);

    const serviceOptions: ServiceOption[] = onlineServices.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    }));

    return { services: serviceOptions, staff: staffOptions };
  } catch (error) {
    console.error('[booking-page] Failed to load booking data', error);
    return { services: [], staff: [] };
  }
}

export default async function BookingPage() {
  const { services, staff } = await loadBookingData();
  const csrfToken = ensureCsrfToken();
  const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? undefined;

  if (!services.length) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Termin online buchen</Heading>
        <p className="text-slate-600">
          Onlinebuchungen werden vorbereitet. Bitte kontaktiere uns telefonisch oder per E-Mail, damit wir dir deinen Wunschtermin
          sichern können.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Heading level={1}>Termin online buchen</Heading>
        <p className="text-slate-600">
          Suche dir deinen Lieblingsservice, das passende Teammitglied und einen Termin, der perfekt in deinen Alltag passt.
          Die Bestätigung inklusive Kalender-ICS landet direkt in deinem Postfach.
        </p>
      </header>
      <BookingForm captchaSiteKey={captchaSiteKey} csrfToken={csrfToken} services={services} staff={staff} />
      <section className="rounded-3xl bg-slate-900 p-6 text-white">
        <Heading className="text-lg" level={2}>
          Transparenter Salonservice
        </Heading>
        <ul className="mt-4 space-y-2 text-sm">
          <li>✓ Buchungsfenster bis 24 Stunden vor Termin, danach Verschiebeanfrage möglich</li>
          <li>✓ Erinnerungs-E-Mails mit Kalendereintrag und direkter Storno-Option</li>
          <li>✓ Sichere Verarbeitung deiner Daten in der Schweiz – DSG und DSGVO konform</li>
        </ul>
      </section>
    </div>
  );
}
