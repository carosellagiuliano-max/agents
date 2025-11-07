import { describe, expect, it } from 'vitest';

import {
  TAX_RATES,
  accumulateOrderTotals,
  applySwissCashRounding,
  calculateTaxCents,
  resolveTaxBandFromPercentage,
} from '../src/money';

describe('money utilities', () => {
  it('calculates tax in cents with Swiss precision', () => {
    expect(calculateTaxCents(10000, TAX_RATES.standard)).toBe(810);
    expect(calculateTaxCents(5000, TAX_RATES.reduced)).toBe(130);
  });

  it('aggregates totals and tax breakdown per band', () => {
    const totals = accumulateOrderTotals([
      { quantity: 1, unitPriceCents: 12500, taxBand: 'standard' },
      { quantity: 2, unitPriceCents: 3500, taxBand: 'reduced' },
      { quantity: 1, unitPriceCents: 20000, taxBand: 'lodging' },
    ]);

    expect(totals.subtotalCents).toBe(39500);
    expect(totals.taxCents).toBe(1955);
    expect(totals.totalCents).toBe(41455);
    expect(totals.breakdown.standard).toEqual({ netCents: 12500, taxCents: 1013 });
    expect(totals.breakdown.reduced).toEqual({ netCents: 7000, taxCents: 182 });
    expect(totals.breakdown.lodging).toEqual({ netCents: 20000, taxCents: 760 });
  });

  it('rounds totals to the nearest 5 rappen for cash payments', () => {
    expect(applySwissCashRounding(100)).toBe(100);
    expect(applySwissCashRounding(102)).toBe(100);
    expect(applySwissCashRounding(103)).toBe(105);
    expect(applySwissCashRounding(107)).toBe(105);
    expect(applySwissCashRounding(108)).toBe(110);
  });

  it('resolves the closest Swiss tax band for a rate percentage', () => {
    expect(resolveTaxBandFromPercentage(8.1)).toBe('standard');
    expect(resolveTaxBandFromPercentage(2.5)).toBe('reduced');
    expect(resolveTaxBandFromPercentage(4.0)).toBe('lodging');
  });
});
