import Link from 'next/link';

import { sql } from '@schnittwerk/db';

import { Heading } from '@schnittwerk/ui';

import { getDatabase } from '@/lib/db';
import { formatRoleList, getCurrentActor, hasAnyRole } from '@/lib/auth';

import { anonymizeCustomerAction, updateMarketingConsentAction } from './actions';

const CUSTOMER_ROLES = ['owner', 'admin', 'manager', 'reception'];

type CustomerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  appointment_count: number;
  last_visit: string | null;
  revenue_cents: number;
};

type CustomerView = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  createdAt: Date;
  appointmentCount: number;
  lastVisit?: Date;
  revenueCents: number;
};

async function loadCustomers(): Promise<CustomerView[]> {
  const db = getDatabase();
  const result = await db.execute(
    sql`select c.id, c.first_name, c.last_name, c.email, c.phone, c.marketing_opt_in, c.created_at,
            coalesce(count(*) filter (where a.status not in ('cancelled', 'no_show')), 0) as appointment_count,
            max(lower(a.slot)) as last_visit,
            coalesce(sum(o.total_cents) filter (where o.status in ('paid', 'fulfilled')), 0) as revenue_cents
        from customers c
        left join appointments a on a.customer_id = c.id
        left join orders o on o.customer_id = c.id
        group by c.id
        order by c.created_at desc
        limit 200`,
  );

  return (result.rows as CustomerRow[]).map((row) => ({
    id: row.id,
    name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'Unbekannt',
    email: row.email,
    phone: row.phone,
    marketingOptIn: row.marketing_opt_in,
    createdAt: new Date(row.created_at),
    appointmentCount: Number(row.appointment_count ?? 0),
    lastVisit: row.last_visit ? new Date(row.last_visit) : undefined,
    revenueCents: Number(row.revenue_cents ?? 0),
  }));
}

function formatDateTime(value?: Date): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(cents / 100);
}

type PageProps = {
  searchParams?: {
    notice?: string;
    error?: string;
  };
};

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const actor = getCurrentActor();
  if (!hasAnyRole(actor, CUSTOMER_ROLES)) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <Heading level={1}>Zugriff verweigert</Heading>
        <p>Dieser Bereich benötigt Rollen mit Kundenverwaltung ({formatRoleList(CUSTOMER_ROLES)}).</p>
      </div>
    );
  }

  const notice = searchParams?.notice;
  const error = searchParams?.error;
  const customers = await loadCustomers();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading level={1}>Kund:innenverwaltung</Heading>
          <p className="text-sm text-slate-600">Export, Einwilligungen und Löschprozesse gemäss DSG/DSGVO.</p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          href="/api/admin/customers/export"
        >
          CSV Export
        </Link>
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
      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Kontakt</th>
              <th className="px-4 py-3">Termine</th>
              <th className="px-4 py-3">Letzter Besuch</th>
              <th className="px-4 py-3">Umsatz</th>
              <th className="px-4 py-3">Einwilligung</th>
              <th className="px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{customer.name}</div>
                  <div className="text-xs text-slate-500">seit {formatDateTime(customer.createdAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-600">{customer.email ?? '—'}</div>
                  <div className="text-xs text-slate-600">{customer.phone ?? '—'}</div>
                </td>
                <td className="px-4 py-3">{customer.appointmentCount}</td>
                <td className="px-4 py-3">{formatDateTime(customer.lastVisit)}</td>
                <td className="px-4 py-3">{formatCurrency(customer.revenueCents)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      customer.marketingOptIn
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {customer.marketingOptIn ? 'Opt-in' : 'Kein Opt-in'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <form action={updateMarketingConsentAction} className="inline">
                      <input name="customerId" type="hidden" value={customer.id} />
                      <input name="marketingOptIn" type="hidden" value={(!customer.marketingOptIn).toString()} />
                      <button
                        className="w-full rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        type="submit"
                      >
                        {customer.marketingOptIn ? 'Opt-in widerrufen' : 'Opt-in aktivieren'}
                      </button>
                    </form>
                    <form action={anonymizeCustomerAction} className="inline">
                      <input name="customerId" type="hidden" value={customer.id} />
                      <button
                        className="w-full rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        type="submit"
                      >
                        Daten löschen
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
