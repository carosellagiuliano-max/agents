const TAX_RATE_STANDARD = 0.081;
const TAX_RATE_REDUCED = 0.026;
const TAX_RATE_LODGING = 0.038;

const TAX_RATE_PERCENT_STANDARD = 8.1;
const TAX_RATE_PERCENT_REDUCED = 2.6;
const TAX_RATE_PERCENT_LODGING = 3.8;

export const TAX_RATES = {
  standard: TAX_RATE_STANDARD,
  reduced: TAX_RATE_REDUCED,
  lodging: TAX_RATE_LODGING,
} as const;

const TAX_PERCENTAGES: Record<TaxBand, number> = {
  standard: TAX_RATE_PERCENT_STANDARD,
  reduced: TAX_RATE_PERCENT_REDUCED,
  lodging: TAX_RATE_PERCENT_LODGING,
};

export type TaxBand = keyof typeof TAX_RATES;

type OrderLine = {
  quantity: number;
  unitPriceCents: number;
  taxBand: TaxBand;
};

export type OrderTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  breakdown: Record<TaxBand, { netCents: number; taxCents: number }>;
};

export function calculateTaxCents(amountCents: number, rate: number): number {
  return Math.round(amountCents * rate);
}

export function applySwissCashRounding(totalCents: number): number {
  const remainder = totalCents % 5;
  if (remainder === 0) {
    return totalCents;
  }

  if (remainder < 3) {
    return totalCents - remainder;
  }

  return totalCents + (5 - remainder);
}

export function accumulateOrderTotals(lines: OrderLine[]): OrderTotals {
  const breakdown: OrderTotals['breakdown'] = {
    standard: { netCents: 0, taxCents: 0 },
    reduced: { netCents: 0, taxCents: 0 },
    lodging: { netCents: 0, taxCents: 0 },
  };

  let subtotalCents = 0;
  let taxCents = 0;

  for (const line of lines) {
    const net = line.quantity * line.unitPriceCents;
    subtotalCents += net;

    const bandRate = TAX_RATES[line.taxBand];
    const lineTax = calculateTaxCents(net, bandRate);
    taxCents += lineTax;

    breakdown[line.taxBand].netCents += net;
    breakdown[line.taxBand].taxCents += lineTax;
  }

  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    breakdown,
  };
}

export function resolveTaxBandFromPercentage(ratePercentage: number): TaxBand {
  const entries = Object.entries(TAX_PERCENTAGES) as Array<[TaxBand, number]>;
  const [band] = entries.reduce<[TaxBand, number]>((closest, entry) => {
    const [, currentValue] = entry;
    const [, closestValue] = closest;
    const currentDiff = Math.abs(currentValue - ratePercentage);
    const closestDiff = Math.abs(closestValue - ratePercentage);
    if (currentDiff < closestDiff) {
      return [entry[0], currentValue];
    }
    return closest;
  }, entries[0]!);

  return band;
}
