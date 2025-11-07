import { Heading } from '@schnittwerk/ui';

import { formatRoleList, getCurrentActor, hasAnyRole } from '@/lib/auth';

import { ANALYTICS_ROLES, fetchAnalyticsMetrics } from './data';

import type { AnalyticsMetrics } from './data';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(cents / 100);
}

export default async function AdminAnalyticsPage() {
  const actor = getCurrentActor();
  if (!hasAnyRole(actor, ANALYTICS_ROLES)) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <Heading level={1}>Zugriff verweigert</Heading>
        <p>Analytics ist Owner/Admin/Manager vorbehalten ({formatRoleList(ANALYTICS_ROLES)}).</p>
      </div>
    );
  }

  const { services, channels, appointments, customers }: AnalyticsMetrics = await fetchAnalyticsMetrics();
  const totalRevenue = services.reduce((sum, item) => sum + item.revenueCents, 0);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Heading level={1}>Analytics & Reporting</Heading>
          <p className="text-sm text-slate-600">Datenbasis für Monatsabschlüsse, Marketing und Auslastungsplanung.</p>
        </div>
        <a
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          href="/api/admin/analytics/export"
        >
          CSV Export
        </a>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-sm font-medium text-slate-500" level={3}>
            Umsatz (Services, kumuliert)
          </Heading>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-slate-500">Top 10 Leistungen siehe Tabelle unten</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-sm font-medium text-slate-500" level={3}>
            Aktive Vertriebskanäle
          </Heading>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{channels.length}</p>
          <p className="text-xs text-slate-500">Basierend auf order.source</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-sm font-medium text-slate-500" level={3}>
            Terminstatus (90 Tage)
          </Heading>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{appointments.reduce((sum, item) => sum + item.count, 0)}</p>
          <p className="text-xs text-slate-500">inkl. No-Show Monitoring</p>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Services nach Umsatz
          </Heading>
          <table className="mt-4 w-full table-auto text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Service</th>
                <th className="py-2">Termine</th>
                <th className="py-2">Umsatz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {services.map((service) => (
                <tr key={service.serviceName ?? 'unbekannt'}>
                  <td className="py-2 text-slate-700">{service.serviceName ?? 'Unbekannt'}</td>
                  <td className="py-2 text-slate-600">{service.completed}</td>
                  <td className="py-2 text-slate-900">{formatCurrency(service.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Orders nach Kanal
          </Heading>
          <table className="mt-4 w-full table-auto text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Kanal</th>
                <th className="py-2">Bestellungen</th>
                <th className="py-2">Umsatz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {channels.map((channel) => (
                <tr key={channel.source ?? 'unknown'}>
                  <td className="py-2 text-slate-700">{channel.source ?? 'unknown'}</td>
                  <td className="py-2 text-slate-600">{channel.orders}</td>
                  <td className="py-2 text-slate-900">{formatCurrency(channel.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Terminstatus (90 Tage)
          </Heading>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {appointments.map((item) => (
              <li className="flex items-center justify-between" key={item.status}>
                <span className="uppercase tracking-wide text-slate-500">{item.status}</span>
                <span className="font-semibold text-slate-900">{item.count}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Neue Kund:innen pro Monat
          </Heading>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {customers.map((item) => (
              <li className="flex items-center justify-between" key={item.month}>
                <span>{item.month}</span>
                <span className="font-semibold text-slate-900">{item.newCustomers}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
