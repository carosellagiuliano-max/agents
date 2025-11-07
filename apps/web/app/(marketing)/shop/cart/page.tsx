import Link from 'next/link';

import { Heading } from '@schnittwerk/ui';

import { clearCartAction, getCartSnapshot } from '@/app/(marketing)/shop/actions';
import CartQuantityForm from '@/components/shop/CartQuantityForm';
import RemoveFromCartForm from '@/components/shop/RemoveFromCartForm';
import { computeCart } from '@/lib/shop';

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export const metadata = {
  title: 'Warenkorb',
  description: 'Aktuelle Produkte im Warenkorb ansehen und für den Checkout vorbereiten.',
};

export default async function CartPage() {
  const cartCookie = await getCartSnapshot();
  const cart = await computeCart(cartCookie);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Heading level={1}>Warenkorb</Heading>
        <p className="max-w-2xl text-slate-700">
          Prüfen Sie Ihre Auswahl bevor Sie zur sicheren Bezahlung über SumUp oder Stripe weitergeleitet werden. Lagerstände
          werden in Echtzeit geprüft, Reservierungen gelten für 15 Minuten.
        </p>
      </header>

      {cart.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-600">Ihr Warenkorb ist noch leer. Stöbern Sie im Shop und fügen Sie Produkte hinzu.</p>
          <Link className="mt-4 inline-block rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white" href="/shop">
            Zum Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <ul className="space-y-4">
            {cart.items.map((item) => (
              <li className="rounded-3xl border border-slate-200 p-5" key={item.variantId}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{item.productName}</h2>
                    <p className="text-sm text-slate-600">Variante: {item.variantName}</p>
                    <p className="mt-2 text-sm text-slate-700">Einzelpreis: {formatCurrency(item.unitPriceCents)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.stockTracking
                        ? item.availableQuantity && item.availableQuantity > 0
                          ? `${item.availableQuantity} Stück verfügbar`
                          : 'Momentan ausverkauft'
                        : 'Bestellung auf Anfrage möglich'}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <CartQuantityForm
                      max={item.availableQuantity ?? undefined}
                      quantity={item.quantity}
                      variantId={item.variantId}
                    />
                    <RemoveFromCartForm variantId={item.variantId} />
                    <p className="text-sm font-semibold text-slate-900">
                      Zwischensumme: {formatCurrency(item.unitPriceCents * item.quantity)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="space-y-4 rounded-3xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Zusammenfassung</h2>
            <dl className="space-y-1 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <dt>Zwischensumme</dt>
                <dd>{formatCurrency(cart.totals.subtotalCents)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Mehrwertsteuer</dt>
                <dd>{formatCurrency(cart.totals.taxCents)}</dd>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatCurrency(cart.totals.totalCents)}</dd>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <dt>Bargeld gerundet</dt>
                <dd>{formatCurrency(cart.totals.cashRoundedTotalCents)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3">
              <form action={clearCartAction}>
                <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600" type="submit">
                  Warenkorb leeren
                </button>
              </form>
              <Link
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                href="/shop/checkout"
              >
                Zur Kasse
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
