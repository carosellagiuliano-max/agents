import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';

import { buildAppointmentIcs } from '../../app/api/booking/_lib/email';

const start = DateTime.fromISO('2024-06-01T09:00:00', { zone: 'Europe/Zurich' });
const end = start.plus({ minutes: 60 });

describe('booking email helpers', () => {
  it('builds a valid ICS payload', () => {
    const ics = buildAppointmentIcs({
      appointmentId: 'test-id',
      serviceName: 'Signature Haarschnitt',
      staffName: 'Luca Style',
      start,
      end,
      customerName: 'Mara Kundin',
      customerEmail: 'mara@example.com',
      locale: 'de-CH',
      location: 'Schnittwerk, Rorschacher Str. 152, St. Gallen',
    });

    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Termin: Signature Haarschnitt');
    expect(ics).toContain('LOCATION:Schnittwerk\\, Rorschacher Str. 152\\, St. Gallen');
    expect(ics).toContain('END:VEVENT');
  });
});
