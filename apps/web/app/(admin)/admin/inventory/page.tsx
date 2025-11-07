import Link from 'next/link';

import { sql } from '@schnittwerk/db';

import { Heading } from '@schnittwerk/ui';

import { getDatabase } from '@/lib/db';
import { formatRoleList, getCurrentActor, hasAnyRole } from '@/lib/auth';

import { importInventoryCsvAction, recordStockCountAction } from './actions';

const INVENTORY_ROLES = ['owner', 'admin', 'manager'];

type InventoryRow = {
  variant_id: string;
  variant_name: string;
  sku: string | null;
  product_name: string;
  quantity: number | null;
  threshold: number | null;
  location: string | null;
};

type InventoryItem = {
  variantId: string;
  variantName: string;
  sku: string;
  productName: string;
  quantity: number;
  threshold: number | null;
  location: string | null;
};

async function loadInventory(): Promise<InventoryItem[]> {
  const db = getDatabase();
  const result = await db.execute(
    sql`select v.id as variant_id, v.name as variant_name, v.sku, p.name as product_name, si.quantity, si.threshold, si.location
        from product_variants v
        join products p on p.id = v.product_id
        left join stock_items si on si.variant_id = v.id
        where v.is_active = true
        order by p.name asc, v.name asc`,
  );

  return (result.rows as InventoryRow[]).map((row) => ({
    variantId: row.variant_id,
    variantName: row.variant_name,
    sku: row.sku ?? '—',
    productName: row.product_name,
    quantity: Number.isFinite(row.quantity) ? Number(row.quantity) : 0,
    threshold: row.threshold !== null ? Number(row.threshold) : null,
    location: row.location,
  }));
}

type PageProps = {
  searchParams?: {
    notice?: string;
    error?: string;
  };
};

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const actor = getCurrentActor();
  if (!hasAnyRole(actor, INVENTORY_ROLES)) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <Heading level={1}>Zugriff verweigert</Heading>
        <p>Inventur ist nur für Owner/Admin/Manager zugänglich ({formatRoleList(INVENTORY_ROLES)}).</p>
      </div>
    );
  }

  const notice = searchParams?.notice;
  const error = searchParams?.error;
  const inventory = await loadInventory();

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading level={1}>Inventur & Lager</Heading>
          <p className="text-sm text-slate-600">Zähllisten, CSV-Import und Nachvollziehbarkeit via Audit-Log.</p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          href="/api/admin/inventory/export"
        >
          CSV Export
        </Link>
      </header>
      {notice ? (
        <p className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            CSV Import
          </Heading>
          <p className="mt-2 text-sm text-slate-600">
            Erwartetes Format: <code>sku,quantity,reason,notes</code>. Header optional, Trennzeichen Komma.
          </p>
          <form
            action={importInventoryCsvAction}
            className="mt-4 space-y-4"
            encType="multipart/form-data"
            method="post"
          >
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              CSV-Datei
              <input
                accept=".csv,text/csv"
                className="rounded-full border border-slate-300 px-3 py-2 text-sm"
                name="file"
                type="file"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Oder Einfügen
              <textarea
                className="min-h-[120px] rounded-3xl border border-slate-300 px-4 py-3 text-sm"
                name="csv"
                placeholder="sku,quantity,reason,notes"
              />
            </label>
            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="submit"
            >
              Import starten
            </button>
          </form>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Heading className="text-lg" level={2}>
            Hinweise
          </Heading>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>✅ Jeder Import erzeugt pro SKU einen Audit-Log-Eintrag (Aktion <code>inventory_import</code>).</li>
            <li>✅ Schwellwerte (`threshold`) definieren die Warnstufe und erscheinen rot in der Tabelle.</li>
            <li>✅ Für spontane Zählungen Formular in der Tabelle verwenden – Grund und Notiz werden protokolliert.</li>
          </ul>
        </article>
      </section>
      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Produkt</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Bestand</th>
              <th className="px-4 py-3 text-left">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {inventory.map((item) => {
              const belowThreshold =
                item.threshold !== null && item.threshold > 0 && item.quantity <= item.threshold;
              return (
                <tr className={belowThreshold ? 'bg-rose-50/60' : undefined} key={item.variantId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.productName}</div>
                    <div className="text-xs text-slate-500">{item.variantName}</div>
                    <div className="text-xs text-slate-400">Lager: {item.location ?? 'unbekannt'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.sku}</td>
                  <td className="px-4 py-3">
                    <span className="text-lg font-semibold text-slate-900">{item.quantity}</span>
                    {item.threshold !== null ? (
                      <span className="ml-2 text-xs text-slate-500">Schwelle: {item.threshold}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <form action={recordStockCountAction} className="flex flex-col gap-2 text-xs text-slate-600">
                      <input name="variantId" type="hidden" value={item.variantId} />
                      <label className="flex items-center gap-2">
                        <span>Neuer Bestand</span>
                        <input
                          className="w-24 rounded-full border border-slate-300 px-3 py-1 text-sm"
                          defaultValue={item.quantity}
                          min={0}
                          name="quantity"
                          type="number"
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <span>Grund</span>
                        <input
                          className="flex-1 rounded-full border border-slate-300 px-3 py-1"
                          name="reason"
                          placeholder="z. B. Inventur Mai"
                          type="text"
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <span>Notiz</span>
                        <input
                          className="flex-1 rounded-full border border-slate-300 px-3 py-1"
                          name="notes"
                          placeholder="optional"
                          type="text"
                        />
                      </label>
                      <button
                        className="w-full rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        type="submit"
                      >
                        Bestand speichern
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
