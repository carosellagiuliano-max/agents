import type { AnalyticsMetrics } from './data';

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(values: Array<string | number>): string {
  return values.map((value) => escapeCsv(String(value))).join(',');
}

export function buildAnalyticsCsv(metrics: AnalyticsMetrics): string {
  const lines: string[] = [toCsvRow(['section', 'label', 'value', 'extra'])];

  const totalRevenue = metrics.services.reduce((sum, item) => sum + item.revenueCents, 0);
  const totalAppointments = metrics.appointments.reduce((sum, item) => sum + item.count, 0);
  const noShowCount = metrics.appointments.find((item) => item.status === 'no_show')?.count ?? 0;
  const noShowRate = totalAppointments === 0 ? 0 : Math.round((noShowCount / totalAppointments) * 1000) / 10;

  lines.push(toCsvRow(['metric', 'total_revenue_cents', totalRevenue, '']));
  lines.push(toCsvRow(['metric', 'total_appointments_90d', totalAppointments, '']));
  lines.push(toCsvRow(['metric', 'no_show_rate_percent', noShowRate.toFixed(1), 'percentage of appointments marked no_show']));
  lines.push(toCsvRow(['metric', 'active_channels', metrics.channels.length, '']));

  for (const service of metrics.services) {
    lines.push(
      toCsvRow([
        'service',
        service.serviceName ?? 'Unbekannt',
        service.completed,
        `revenue_cents=${service.revenueCents}`,
      ]),
    );
  }

  for (const channel of metrics.channels) {
    lines.push(
      toCsvRow([
        'channel',
        channel.source ?? 'unknown',
        channel.orders,
        `revenue_cents=${channel.revenueCents}`,
      ]),
    );
  }

  for (const appointment of metrics.appointments) {
    lines.push(toCsvRow(['appointment_status', appointment.status, appointment.count, '']));
  }

  for (const customer of metrics.customers) {
    lines.push(toCsvRow(['new_customers', customer.month, customer.newCustomers, '']));
  }

  return lines.join('\n');
}
