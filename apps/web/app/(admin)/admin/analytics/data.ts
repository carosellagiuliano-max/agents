import { sql } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';

export const ANALYTICS_ROLES: string[] = ['owner', 'admin', 'manager'];

export type ServiceMetric = {
  serviceName: string | null;
  completed: number;
  revenueCents: number;
};

export type ChannelMetric = {
  source: string | null;
  orders: number;
  revenueCents: number;
};

export type AppointmentMetric = {
  status: string;
  count: number;
};

export type CustomerMetric = {
  month: string;
  newCustomers: number;
};

export type AnalyticsMetrics = {
  services: ServiceMetric[];
  channels: ChannelMetric[];
  appointments: AppointmentMetric[];
  customers: CustomerMetric[];
};

type RawServiceRow = {
  service_name: string | null;
  completed: number | string | null;
  revenue_cents: number | string | null;
};

type RawChannelRow = {
  source: string | null;
  orders: number | string | null;
  revenue_cents: number | string | null;
};

type RawAppointmentRow = {
  status: string;
  count: number | string | null;
};

type RawCustomerRow = {
  month: string;
  new_customers: number | string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
}

export async function fetchAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  const db = getDatabase();
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const [serviceResult, channelResult, appointmentResult, customerResult] = await Promise.all([
    db.execute(
      sql`select s.name as service_name,
              count(*) as completed,
              coalesce(sum(oi.total_cents), 0) as revenue_cents
            from order_items oi
            left join services s on s.id = oi.service_id
            join orders o on o.id = oi.order_id
            where o.status in ('paid', 'fulfilled')
            group by s.name
            order by revenue_cents desc
            limit 10`,
    ),
    db.execute(
      sql`select o.source, count(*) as orders, coalesce(sum(o.total_cents), 0) as revenue_cents
            from orders o
            where o.status in ('paid', 'fulfilled')
            group by o.source
            order by revenue_cents desc`,
    ),
    db.execute(
      sql`select status, count(*)
            from appointments
            where created_at >= ${ninetyDaysAgo.toISOString()}
            group by status
            order by status asc`,
    ),
    db.execute(
      sql`select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
              count(*) as new_customers
            from customers
            group by 1
            order by 1 desc
            limit 6`,
    ),
  ]);

  const services = (serviceResult.rows as RawServiceRow[]).map((row) => ({
    serviceName: row.service_name,
    completed: toNumber(row.completed),
    revenueCents: toNumber(row.revenue_cents),
  }));

  const channels = (channelResult.rows as RawChannelRow[]).map((row) => ({
    source: row.source,
    orders: toNumber(row.orders),
    revenueCents: toNumber(row.revenue_cents),
  }));

  const appointments = (appointmentResult.rows as RawAppointmentRow[]).map((row) => ({
    status: row.status,
    count: toNumber(row.count),
  }));

  const customers = (customerResult.rows as RawCustomerRow[]).map((row) => ({
    month: row.month,
    newCustomers: toNumber(row.new_customers),
  }));

  return {
    services,
    channels,
    appointments,
    customers,
  };
}
