import { sql } from '@schnittwerk/db';

import { Heading } from '@schnittwerk/ui';

import { getDatabase } from '@/lib/db';
import { formatRoleList, getCurrentActor, hasAnyRole } from '@/lib/auth';

const DASHBOARD_ROLES = ['owner', 'admin', 'manager'];

type DashboardMetrics = {
  customers_total: number;
  customers_opt_in: number;
  appointments_upcoming: number;
  revenue_cents: number;
  low_stock: number;
  no_show_month: number;
  attended_month: number;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(cents / 100);
}

export default async function AdminDashboardPage() {
  const actor = getCurrentActor();
  if (!hasAnyRole(actor, DASHBOARD_ROLES)) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <Heading level={1}>Zugriff verweigert</Heading>
        <p>Die Übersicht steht nur Owner, Admin und Manager Rollen zur Verfügung ({formatRoleList(DASHBOARD_ROLES)}).</p>
      </div>
    );
  }

  const db = getDatabase();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const metricsResult = await db.execute(
    sql`select
        (select count(*) from customers) as customers_total,
        (select count(*) from customers where marketing_opt_in = true) as customers_opt_in,
        (select count(*) from appointments where status not in ('cancelled', 'no_show') and slot && tstzrange(${now.toISOString()}, ${weekAhead.toISOString()}, '[)')) as appointments_upcoming,
        (select coalesce(sum(total_cents), 0) from orders where status in ('paid', 'fulfilled') and created_at >= ${monthStart.toISOString()}) as revenue_cents,
        (select count(*) from stock_items where threshold is not null and threshold > 0 and quantity <= threshold) as low_stock,
        (select count(*) from appointments where status = 'no_show' and created_at >= ${monthStart.toISOString()}) as no_show_month,
        (select count(*) from appointments where status in ('confirmed', 'completed', 'no_show') and created_at >= ${monthStart.toISOString()}) as attended_month;
      `,
  );

  const row = metricsResult.rows[0] as DashboardMetrics | undefined;
  const metrics: DashboardMetrics = {
    customers_total: Number(row?.customers_total ?? 0),
    customers_opt_in: Number(row?.customers_opt_in ?? 0),
    appointments_upcoming: Number(row?.appointments_upcoming ?? 0),
    revenue_cents: Number(row?.revenue_cents ?? 0),
    low_stock: Number(row?.low_stock ?? 0),
    no_show_month: Number(row?.no_show_month ?? 0),
    attended_month: Number(row?.attended_month ?? 0),
  };

  const noShowRate = metrics.attended_month
    ? Math.round((metrics.no_show_month / metrics.attended_month) * 1000) / 10
    : 0;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Heading level={1}>Team-Dashboard</Heading>
        <p className="text-sm text-slate-600">
          Überblick über Buchungen, Umsatz und operative Aufgaben in den nächsten Tagen.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-sm font-medium text-slate-500" level={3}>
            Aktive Kund:innen
          </Heading>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{metrics.customers_total}</p>
          <p className="text-xs text-slate-500">{metrics.customers_opt_in} mit Marketing-Einwilligung</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-sm font-medium text-slate-500" level={3}>
            Termine (7 Tage)
          </Heading>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{metrics.appointments_upcoming}</p>
          <p className="text-xs text-slate-500">inkl. Online & Telefonbuchungen</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-sm font-medium text-slate-500" level={3}>
            Monatsumsatz
          </Heading>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(metrics.revenue_cents)}</p>
          <p className="text-xs text-slate-500">inkl. bezahlte & erfüllte Bestellungen</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-sm font-medium text-slate-500" level={3}>
            Kritische Bestände
          </Heading>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{metrics.low_stock}</p>
          <p className="text-xs text-slate-500">Varianten unter Mindestbestand</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-sm font-medium text-slate-500" level={3}>
            No-Show Rate (Monat)
          </Heading>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{noShowRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-500">Basierend auf bestätigten Terminen</p>
        </article>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Tagesaufgaben
          </Heading>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>☑️ Kalender prüfen und Terminnotizen für heute aktualisieren.</li>
            <li>☑️ Inventuraufgaben für Varianten mit kritischem Bestand planen.</li>
            <li>☑️ Neue Kund:innen mit fehlender Marketing-Einwilligung informieren.</li>
          </ul>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Hinweise
          </Heading>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>
              📦 Exportiere eine aktuelle Inventurliste über <code>Inventur → CSV Export</code> vor jeder Warenlieferung.
            </li>
            <li>
              🔐 Änderst du Einstellungen, wird automatisch ein Audit-Eintrag erzeugt. Prüfe die Logs bei Sicherheitsfragen.
            </li>
            <li>📈 Analytics liefert Umsatz nach Kanal und Service – nutze die Daten für Monatsberichte.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
