import Link from 'next/link';

import { Heading } from '@schnittwerk/ui';

import { getCartSnapshot } from '@/app/(marketing)/shop/actions';
import CheckoutForm from '@/components/shop/CheckoutForm';
import { computeCart } from '@/lib/shop';

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export const metadata = {
  title: 'Checkout',
  description: 'Kundendaten erfassen und Online-Zahlung für den Einkauf abschliessen.',
};

export default async function CheckoutPage() {
  const cartSnapshot = await getCartSnapshot();
  const cart = await computeCart(cartSnapshot);

  if (cart.items.length === 0) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Checkout</Heading>
        <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-600">Ihr Warenkorb ist leer. Bitte wählen Sie Produkte aus, bevor Sie zur Kasse gehen.</p>
          <Link className="mt-4 inline-block rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white" href="/shop">
            Zurück zum Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Heading level={1}>Checkout</Heading>
        <p className="max-w-2xl text-slate-700">
          Ihre Bestellung wird über eine gesicherte Verbindung abgewickelt. Nach Abschluss erhalten Sie eine Quittung per
          E-Mail sowie eine Benachrichtigung, sobald die Produkte versendet wurden.
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6 rounded-3xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Kundendaten</h2>
          <CheckoutForm totalCents={cart.totals.totalCents} />
        </section>
        <aside className="space-y-4 rounded-3xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Bestellübersicht</h2>
          <ul className="space-y-3 text-sm text-slate-700">
            {cart.items.map((item) => (
              <li className="flex items-center justify-between" key={item.variantId}>
                <div>
                  <p className="font-medium text-slate-900">{item.productName}</p>
                  <p className="text-xs text-slate-500">{item.variantName} × {item.quantity}</p>
                </div>
                <span>{formatCurrency(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
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
          <p className="text-xs text-slate-500">
            Mit dem Absenden akzeptieren Sie unsere AGB sowie die Datenschutz- und Widerrufsbedingungen. Onlinezahlungen werden
            via SumUp oder Stripe verarbeitet.
          </p>
        </aside>
      </div>
    </div>
  );
}
