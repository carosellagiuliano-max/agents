import { sql } from '@schnittwerk/db';

import { Heading } from '@schnittwerk/ui';

import { getDatabase } from '@/lib/db';
import { formatRoleList, getCurrentActor, hasAnyRole } from '@/lib/auth';

import {
  addOpeningExceptionAction,
  deleteOpeningExceptionAction,
  toggleStaffStatusAction,
  updateBookingSettingsAction,
  updateRoleAssignmentAction,
  upsertOpeningHoursAction,
} from './actions';

const SETTINGS_ROLES = ['owner', 'admin'];

type SettingRow = {
  key: string;
  value: unknown;
};

type OpeningHourRow = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type OpeningExceptionRow = {
  id: string;
  date: string;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
  reason: string | null;
};

type StaffRow = {
  id: string;
  display_name: string;
  is_active: boolean;
  user_id: string | null;
  roles: string[] | null;
};

type UserRoleRow = {
  id: string;
  full_name: string | null;
  roles: string[] | null;
};

const DAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function normalizeHours(rows: OpeningHourRow[]): Array<{ dayOfWeek: number; opensAt: string | null; closesAt: string | null; isClosed: boolean }> {
  const map = new Map<number, OpeningHourRow>();
  for (const row of rows) {
    map.set(row.day_of_week, row);
  }

  const normalized: Array<{ dayOfWeek: number; opensAt: string | null; closesAt: string | null; isClosed: boolean }> = [];
  for (let day = 0; day < 7; day += 1) {
    const entry = map.get(day);
    normalized.push({
      dayOfWeek: day,
      opensAt: entry?.opens_at ?? '09:00',
      closesAt: entry?.closes_at ?? '18:00',
      isClosed: entry?.is_closed ?? false,
    });
  }
  return normalized;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('de-CH', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

async function loadSettings() {
  const db = getDatabase();
  const [settingsResult, hoursResult, exceptionsResult, staffResult, userRolesResult] = await Promise.all([
    db.execute(
      sql`select key, value from settings where key in ('booking.online_enabled', 'booking.cancellation_window_hours', 'booking.require_deposit')`,
    ),
    db.execute(sql`select day_of_week, opens_at, closes_at, is_closed from opening_hours order by day_of_week asc`),
    db.execute(sql`select id, date, is_closed, opens_at, closes_at, reason from opening_exceptions order by date desc limit 20`),
    db.execute(
      sql`select s.id, s.display_name, s.is_active, s.user_id, coalesce(array_agg(ra.role_code) filter (where ra.role_code is not null), '{}') as roles
          from staff s
          left join role_assignments ra on ra.user_id = s.user_id
          group by s.id
          order by s.display_name`,
    ),
    db.execute(
      sql`select u.id, u.full_name, coalesce(array_agg(ra.role_code) filter (where ra.role_code is not null), '{}') as roles
          from users u
          left join role_assignments ra on ra.user_id = u.id
          group by u.id
          order by u.full_name`,
    ),
  ]);

  const settingsMap = new Map<string, unknown>();
  for (const row of settingsResult.rows as SettingRow[]) {
    settingsMap.set(row.key, row.value);
  }

  const onlineBookingEnabled = Boolean(settingsMap.get('booking.online_enabled') ?? true);
  const requireDeposit = Boolean(settingsMap.get('booking.require_deposit') ?? false);
  const cancellationWindow = Number(settingsMap.get('booking.cancellation_window_hours') ?? 24);

  return {
    booking: { onlineBookingEnabled, requireDeposit, cancellationWindow },
    hours: normalizeHours(hoursResult.rows as OpeningHourRow[]),
    exceptions: exceptionsResult.rows as OpeningExceptionRow[],
    staff: (staffResult.rows as StaffRow[]).map((row) => ({
      ...row,
      roles: row.roles ?? [],
    })),
    users: (userRolesResult.rows as UserRoleRow[]).map((row) => ({
      ...row,
      roles: row.roles ?? [],
    })),
  };
}

type PageProps = {
  searchParams?: {
    notice?: string;
    error?: string;
  };
};

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const actor = getCurrentActor();
  if (!hasAnyRole(actor, SETTINGS_ROLES)) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <Heading level={1}>Zugriff verweigert</Heading>
        <p>Dieser Bereich ist auf Owner/Admin Rollen beschränkt ({formatRoleList(SETTINGS_ROLES)}).</p>
      </div>
    );
  }

  const { booking, hours, exceptions, staff, users } = await loadSettings();
  const notice = searchParams?.notice;
  const error = searchParams?.error;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Heading level={1}>Einstellungen & Richtlinien</Heading>
        <p className="text-sm text-slate-600">
          Verwaltung von Buchung, Öffnungszeiten, Team und Rollen mit Audit-Logging.
        </p>
      </header>
      {notice ? (
        <p className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Buchung & Policies
          </Heading>
          <form action={updateBookingSettingsAction} className="mt-4 space-y-4 text-sm text-slate-700">
            <input name="onlineBookingEnabled" type="hidden" value="false" />
            <label className="flex items-center gap-2">
              <input defaultChecked={booking.onlineBookingEnabled} name="onlineBookingEnabled" type="checkbox" value="true" />
              <span>Online-Buchung aktiviert</span>
            </label>
            <input name="requireDeposit" type="hidden" value="false" />
            <label className="flex items-center gap-2">
              <input defaultChecked={booking.requireDeposit} name="requireDeposit" type="checkbox" value="true" />
              <span>Anzahlung erforderlich (Checkout Hinweis)</span>
            </label>
            <label className="flex items-center gap-2">
              <span>Stornofrist (Stunden)</span>
                <input
                  className="w-24 rounded-full border border-slate-300 px-3 py-1"
                  defaultValue={booking.cancellationWindow}
                  max={168}
                  min={0}
                  name="cancellationWindow"
                  type="number"
                />
            </label>
            <button
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="submit"
            >
              Einstellungen speichern
            </button>
          </form>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Sonderöffnungszeiten
          </Heading>
          <form action={addOpeningExceptionAction} className="mt-4 space-y-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <span>Datum</span>
                <input className="rounded-full border border-slate-300 px-3 py-1" name="date" required type="date" />
            </label>
            <input name="isClosed" type="hidden" value="false" />
            <label className="flex items-center gap-2">
              <input name="isClosed" type="checkbox" value="true" />
              <span>Geschlossen</span>
            </label>
            <label className="flex items-center gap-2">
              <span>Öffnet</span>
              <input className="rounded-full border border-slate-300 px-3 py-1" name="opensAt" type="time" />
            </label>
            <label className="flex items-center gap-2">
              <span>Schliesst</span>
              <input className="rounded-full border border-slate-300 px-3 py-1" name="closesAt" type="time" />
            </label>
            <label className="flex items-center gap-2">
              <span>Grund</span>
              <input className="flex-1 rounded-full border border-slate-300 px-3 py-1" name="reason" type="text" />
            </label>
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              type="submit"
            >
              Ausnahme hinzufügen
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-xs text-slate-600">
            {exceptions.map((exception) => (
              <li className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2" key={exception.id}>
                <div>
                  <div className="font-medium text-slate-800">{formatDate(exception.date)}</div>
                  <div>
                    {exception.is_closed ? 'Geschlossen' : `${exception.opens_at ?? '--'} – ${exception.closes_at ?? '--'}`}
                    {exception.reason ? ` (${exception.reason})` : ''}
                  </div>
                </div>
                <form action={deleteOpeningExceptionAction} method="post">
                  <input name="exceptionId" type="hidden" value={exception.id} />
                  <button className="text-rose-600 hover:underline" type="submit">
                    Löschen
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </article>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <Heading className="text-lg" level={2}>
          Öffnungszeiten (Woche)
        </Heading>
        <form action={upsertOpeningHoursAction} className="mt-4 space-y-4 text-sm text-slate-700">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hours.map((hour) => (
              <fieldset className="rounded-2xl border border-slate-200 px-4 py-3" key={hour.dayOfWeek}>
                <legend className="font-semibold text-slate-800">{DAY_LABELS[hour.dayOfWeek]}</legend>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    defaultChecked={hour.isClosed}
                    name={`day-${hour.dayOfWeek}-closed`}
                    type="checkbox"
                    value="on"
                  />
                  <span>Geschlossen</span>
                </label>
                <label className="mt-2 flex items-center gap-2">
                  <span>Start</span>
                  <input
                    className="rounded-full border border-slate-300 px-3 py-1"
                    defaultValue={hour.opensAt ?? ''}
                    name={`day-${hour.dayOfWeek}-opens`}
                    type="time"
                  />
                </label>
                <label className="mt-2 flex items-center gap-2">
                  <span>Ende</span>
                  <input
                    className="rounded-full border border-slate-300 px-3 py-1"
                    defaultValue={hour.closesAt ?? ''}
                    name={`day-${hour.dayOfWeek}-closes`}
                    type="time"
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
            Wochenzeiten speichern
          </button>
        </form>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Team & Verfügbarkeit
          </Heading>
          <table className="mt-4 w-full table-auto text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Rollen</th>
                <th className="py-2">Status</th>
                <th aria-label="Aktionen" className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="py-2 text-slate-700">{member.display_name}</td>
                  <td className="py-2 text-slate-600">{member.roles?.join(', ') || '—'}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {member.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="py-2">
                    <form action={toggleStaffStatusAction} className="flex items-center gap-2">
                      <input name="staffId" type="hidden" value={member.id} />
                      <input name="isActive" type="hidden" value={(!member.is_active).toString()} />
                      <button className="text-xs text-slate-700 underline" type="submit">
                        {member.is_active ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Rollenverwaltung
          </Heading>
          <p className="mt-2 text-xs text-slate-500">Rollenänderungen nur für Owner möglich. Aktionen werden protokolliert.</p>
          <table className="mt-4 w-full table-auto text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Benutzer:in</th>
                <th className="py-2">Rollen</th>
                <th className="py-2">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-2 text-slate-700">{user.full_name ?? 'Ohne Namen'}</td>
                  <td className="py-2 text-slate-600">{user.roles?.join(', ') || '—'}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {['owner', 'admin', 'manager', 'reception', 'stylist'].map((role) => {
                        const hasRole = user.roles?.includes(role) ?? false;
                        return (
                          <form action={updateRoleAssignmentAction} className="inline" key={role}>
                            <input name="userId" type="hidden" value={user.id} />
                            <input name="role" type="hidden" value={role} />
                            <input name="intent" type="hidden" value={hasRole ? 'remove' : 'assign'} />
                            <button
                              className={`rounded-full border px-3 py-1 transition ${
                                hasRole
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-300 bg-white text-slate-600'
                              }`}
                              type="submit"
                            >
                              {hasRole ? `Entfernen ${role}` : `Zuweisen ${role}`}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </div>
  );
}
