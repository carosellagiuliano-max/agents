import type { Metadata } from 'next';
import { Heading } from '@schnittwerk/ui';

import { sql } from '@schnittwerk/db';
import { getDatabase } from '../../../../lib/db';
import { formatRoleList, getCurrentActor, hasAnyRole } from '../../../../lib/auth';

const BUSINESS_TIMEZONE = 'Europe/Zurich';
const VIEW_ROLES = ['owner', 'admin', 'manager', 'reception', 'stylist'];
const ADMIN_ROLES = new Set(['owner', 'admin', 'manager', 'reception']);

export const metadata: Metadata = {
  title: 'Admin · Terminübersicht',
};

type AppointmentRow = {
  id: string;
  status: string;
  slot: string;
  staffName: string;
  serviceName: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string | null;
};

type AppointmentView = {
  id: string;
  status: string;
  staffName: string;
  serviceName: string;
  customerName: string;
  customerEmail: string | null;
  start: Date;
  end: Date;
};

function parseRange(range: string): { start: Date; end: Date } {
  const match = range.match(/^[\[(](.*),(.*)[)\]]$/);
  if (!match) {
    throw new Error(`Ungültiges Zeitfenster: ${range}`);
  }
  return {
    start: new Date(match[1].trim()),
    end: new Date(match[2].trim()),
  };
}

function formatDate(value: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: BUSINESS_TIMEZONE,
    ...options,
  }).format(value);
}

async function loadAppointments(staffId?: string): Promise<Map<string, AppointmentView[]>> {
  const db = getDatabase();
  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setDate(to.getDate() + 7);
  to.setHours(23, 59, 59, 999);

  const result = await db.execute(
    sql`select a.id, a.status, a.slot, s.display_name as staff_name, sv.name as service_name, c.first_name as customer_first_name, c.last_name as customer_last_name, c.email as customer_email
        from appointments a
        join staff s on s.id = a.staff_id
        join services sv on sv.id = a.service_id
        join customers c on c.id = a.customer_id
        where a.status not in ('cancelled', 'no_show')
          and a.slot && tstzrange(${from.toISOString()}, ${to.toISOString()}, '[)')
          ${staffId ? sql`and a.staff_id = ${staffId}` : sql``}
        order by lower(a.slot)`,
  );

  const grouped = new Map<string, AppointmentView[]>();

  for (const row of result.rows as AppointmentRow[]) {
    const interval = parseRange(row.slot);
    const isoKey = interval.start.toISOString().slice(0, 10);
    const appointments = grouped.get(isoKey) ?? [];
    appointments.push({
      id: row.id,
      status: row.status,
      staffName: row.staffName,
      serviceName: row.serviceName,
      customerName: `${row.customerFirstName} ${row.customerLastName}`.trim(),
      customerEmail: row.customerEmail,
      start: interval.start,
      end: interval.end,
    });
    grouped.set(isoKey, appointments);
  }

  return grouped;
}

export default async function AdminAppointmentsPage() {
  const actor = getCurrentActor();
  if (!hasAnyRole(actor, VIEW_ROLES)) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <Heading level={1}>Zugriff verweigert</Heading>
        <p>
          Diese Ansicht ist nur für Rollen mit Kalenderfreigabe verfügbar ({formatRoleList(VIEW_ROLES)}).
        </p>
      </div>
    );
  }

  const restrictToStaff = !actor.roles.some((role) => ADMIN_ROLES.has(role));
  if (restrictToStaff && !actor.staffId) {
    return (
      <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <Heading level={1}>Team-Zuordnung erforderlich</Heading>
        <p>
          Für Stylist:innen muss der Header <code>x-schnittwerk-staff-id</code> gesetzt sein, um den persönlichen Kalender
          einzusehen.
        </p>
      </div>
    );
  }

  const appointmentsByDay = await loadAppointments(restrictToStaff ? actor.staffId : undefined);
  const days = Array.from(appointmentsByDay.entries()).sort(([a], [b]) => (a < b ? -1 : 1));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Heading level={1}>Kalender · Kommende 7 Tage</Heading>
        <p className="text-sm text-slate-600">Alle bestätigten Online-Buchungen inklusive Kundenkontakt.</p>
      </header>
      {days.length === 0 ? (
        <p className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
          Keine Termine gefunden. Sobald Buchungen eintreffen, erscheinen sie hier automatisch.
        </p>
      ) : (
        days.map(([day, appointments]) => (
          <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm" key={day}>
            <Heading className="text-lg" level={2}>
              {formatDate(new Date(`${day}T00:00:00Z`), { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </Heading>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Zeit</th>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2">Team</th>
                    <th className="px-3 py-2">Kunde</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-3 py-2 font-mono">
                        {formatDate(appointment.start, { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {formatDate(appointment.end, { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2">{appointment.serviceName}</td>
                      <td className="px-3 py-2">{appointment.staffName}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{appointment.customerName}</div>
                        {appointment.customerEmail ? (
                          <div className="text-xs text-slate-500">{appointment.customerEmail}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          {appointment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
