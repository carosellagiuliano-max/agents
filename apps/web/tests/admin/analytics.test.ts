import { describe, expect, it } from 'vitest';

import { buildAnalyticsCsv } from '@/app/(admin)/admin/analytics/csv';
import type { AnalyticsMetrics } from '@/app/(admin)/admin/analytics/data';

const SAMPLE_METRICS: AnalyticsMetrics = {
  services: [
    { serviceName: 'Haarschnitt', completed: 12, revenueCents: 24000 },
    { serviceName: 'Farbe "Premium"', completed: 4, revenueCents: 18000 },
  ],
  channels: [
    { source: 'online', orders: 8, revenueCents: 32000 },
    { source: null, orders: 2, revenueCents: 10000 },
  ],
  appointments: [
    { status: 'confirmed', count: 10 },
    { status: 'no_show', count: 1 },
  ],
  customers: [
    { month: '2024-05', newCustomers: 5 },
    { month: '2024-04', newCustomers: 3 },
  ],
};

describe('analytics csv export', () => {
  it('generates csv with metrics header', () => {
    const csv = buildAnalyticsCsv(SAMPLE_METRICS);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('section,label,value,extra');
    expect(lines).toContain('metric,total_revenue_cents,42000,');
    expect(lines).toContain('metric,active_channels,2,');
  });

  it('escapes commas and quotes correctly', () => {
    const csv = buildAnalyticsCsv(SAMPLE_METRICS);
    expect(csv).toContain('service,"Farbe ""Premium""",4,revenue_cents=18000');
  });

  it('includes derived no show rate', () => {
    const csv = buildAnalyticsCsv(SAMPLE_METRICS);
    expect(csv).toContain('metric,no_show_rate_percent,9.1,percentage of appointments marked no_show');
  });
});
