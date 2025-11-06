export enum SwissTaxRate {
  STANDARD = 8.1, // Most goods and services
  REDUCED = 2.6, // Essential items (food, books, medicine)
  SPECIAL = 3.8, // Tourism services (accommodation)
}

export function calculateTax(netAmount: number, rate: SwissTaxRate): number {
  return Math.round(((netAmount * rate) / 100) * 100) / 100;
}

export function calculateGross(netAmount: number, rate: SwissTaxRate): number {
  const tax = calculateTax(netAmount, rate);
  return Math.round((netAmount + tax) * 100) / 100;
}

export function calculateNet(grossAmount: number, rate: SwissTaxRate): number {
  const net = grossAmount / (1 + rate / 100);
  return Math.round(net * 100) / 100;
}

export function formatCurrency(amount: number, currency: string = 'CHF'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function roundCashAmount(amount: number): number {
  // Swiss cash rounding: round to nearest 0.05
  return Math.round(amount * 20) / 20;
}

export interface TaxBreakdown {
  net: number;
  tax: number;
  gross: number;
  rate: SwissTaxRate;
}

export function calculateTaxBreakdown(grossAmount: number, rate: SwissTaxRate): TaxBreakdown {
  const net = calculateNet(grossAmount, rate);
  const tax = grossAmount - net;

  return {
    net: Math.round(net * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    gross: grossAmount,
    rate,
  };
}
