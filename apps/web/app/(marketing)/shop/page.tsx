import { Heading } from '@schnittwerk/ui';

import AddToCartForm from '@/components/shop/AddToCartForm';
import { listCatalogProducts } from '@/lib/shop';

export const metadata = {
  title: 'Shop',
  description: 'Pflegeprodukte, Stylingtools und Geschenke direkt von Schnittwerk bestellen.',
};

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export default async function ShopPage() {
  const products = await listCatalogProducts();
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.schnittwerk-vanessa.ch').replace(/\/$/, '');
  const productStructuredData =
    products.length === 0
      ? []
      : products.map((product) => ({
          '@context': 'https://schema.org',
          '@type': 'Product',
          '@id': `${baseUrl}/shop#product-${product.slug}`,
          name: product.name,
          description: product.description ?? undefined,
          offers: product.variants.map((variant) => ({
            '@type': 'Offer',
            priceCurrency: 'CHF',
            price: (variant.priceCents / 100).toFixed(2),
            availability:
              variant.availableQuantity === null || variant.availableQuantity > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            sku: variant.sku ?? undefined,
          })),
        }));

  return (
    <div className="space-y-10">
      {productStructuredData.length > 0 ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productStructuredData).replace(/</g, '\\u003c'),
          }}
          suppressHydrationWarning
          type="application/ld+json"
        />
      ) : null}
      <header className="space-y-4">
        <Heading level={1}>Shop</Heading>
        <p className="max-w-2xl text-slate-700">
          Pflegen Sie Ihre Haare auch zwischen den Terminen mit unseren sorgfältig ausgewählten Produkten. Alle Preise sind in
          Schweizer Franken inklusive Mehrwertsteuer, der Versand erfolgt klimaneutral ab einem Bestellwert von CHF 120.–.
        </p>
      </header>
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <article
            className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            id={`product-${product.slug}`}
            key={product.id}
          >
            <header className="space-y-2">
              <Heading className="text-lg" level={2}>
                {product.name}
              </Heading>
              <p className="text-sm text-slate-600">{product.description}</p>
            </header>
            <dl className="mt-4 space-y-2 text-sm text-slate-700">
              {product.variants.map((variant) => (
                <div className="rounded-2xl border border-slate-100 p-3" key={variant.id}>
                  <dt className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{variant.name}</span>
                    <span className="text-base font-semibold text-slate-900">{formatCurrency(variant.priceCents)}</span>
                  </dt>
                  <dd className="mt-2 space-y-3">
                    {variant.availableQuantity !== null ? (
                      <p className="text-xs text-slate-500">
                        {variant.availableQuantity > 0
                          ? `Noch ${variant.availableQuantity} Stück verfügbar`
                          : 'Momentan ausverkauft'}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Verfügbar auf Bestellung</p>
                    )}
                    <AddToCartForm
                      availableQuantity={variant.availableQuantity ?? undefined}
                      disabled={variant.availableQuantity !== null && variant.availableQuantity === 0}
                      variantId={variant.id}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>
    </div>
  );
}
