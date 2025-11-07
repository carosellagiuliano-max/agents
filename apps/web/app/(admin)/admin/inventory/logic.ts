import { z } from 'zod';

export type InventoryCsvRow = {
  sku: string;
  quantity: number;
  reason?: string;
  notes?: string;
};

const csvRowSchema = z.object({
  sku: z.string().min(1),
  quantity: z.coerce.number().int(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (inQuotes) {
    throw new Error('CSV-Zeile enthält ungepaartes Anführungszeichen');
  }

  values.push(current.trim());
  return values;
}

export function parseInventoryCsv(text: string): InventoryCsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return [];
  }

  const [firstLine, ...rest] = lines;
  const hasHeader = firstLine.toLowerCase().includes('sku');
  const dataLines = hasHeader ? rest : lines;

  const rows: InventoryCsvRow[] = [];
  for (const line of dataLines) {
    const [sku = '', quantity = '', reason = '', notes = ''] = parseCsvLine(line);
    const parsed = csvRowSchema.parse({ sku, quantity, reason: reason || undefined, notes: notes || undefined });
    rows.push(parsed);
  }

  return rows;
}

export function buildInventoryCsv(rows: InventoryCsvRow[]): string {
  const header = 'sku,quantity,reason,notes';
  const escape = (value: string) => {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = rows.map((row) =>
    [row.sku, String(row.quantity), row.reason ?? '', row.notes ?? ''].map((value) => escape(value)).join(','),
  );

  return [header, ...lines].join('\n');
}
