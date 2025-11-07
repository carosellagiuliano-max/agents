import { describe, expect, it } from 'vitest';

import { buildInventoryCsv, parseInventoryCsv } from '@/app/(admin)/admin/inventory/logic';

describe('inventory csv helpers', () => {
  it('parses CSV with header and quoted values', () => {
    const csv = `sku,quantity,reason,notes\nABC-1,4,"Lieferung","Palette 3"\nXYZ-2,0,Inventur,""`;
    const rows = parseInventoryCsv(csv);
    expect(rows).toEqual([
      { sku: 'ABC-1', quantity: 4, reason: 'Lieferung', notes: 'Palette 3' },
      { sku: 'XYZ-2', quantity: 0, reason: 'Inventur', notes: undefined },
    ]);
  });

  it('serialises rows to CSV with escaping', () => {
    const csv = buildInventoryCsv([
      { sku: 'ABC-1', quantity: 2, reason: 'Inventur', notes: 'Gang "A"' },
    ]);
    expect(csv).toBe('sku,quantity,reason,notes\nABC-1,2,Inventur,"Gang ""A"""');
  });
});
