import { inArray } from '@schnittwerk/db';
import {
  TaxBand,
  accumulateOrderTotals,
  applySwissCashRounding,
  resolveTaxBandFromPercentage,
} from '@schnittwerk/lib';

import type { CartCookie } from '@/app/(marketing)/shop/actions';
import { getDatabase } from '@/lib/db';

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultPriceCents: number;
  variants: Array<{
    id: string;
    name: string;
    priceCents: number;
    sku: string | null;
    availableQuantity: number | null;
  }>;
};

export type CartLineItem = {
  variantId: string;
  quantity: number;
  productName: string;
  variantName: string;
  unitPriceCents: number;
  taxBand: TaxBand;
  availableQuantity: number | null;
  stockTracking: boolean;
};

export type CartComputation = {
  items: CartLineItem[];
  totals: {
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    cashRoundedTotalCents: number;
  };
};

function databaseAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function listCatalogProducts(): Promise<CatalogProduct[]> {
  if (!databaseAvailable()) {
    return [];
  }

  const db = getDatabase();
  const products = await db.query.products.findMany({
    where: (product, { eq }) => eq(product.isActive, true),
    orderBy: (product, { asc }) => asc(product.name),
    columns: {
      id: true,
      name: true,
      slug: true,
      description: true,
      defaultPriceCents: true,
    },
    with: {
      variants: {
        where: (variant, { eq }) => eq(variant.isActive, true),
        columns: {
          id: true,
          name: true,
          priceCents: true,
          sku: true,
          stockTracking: true,
        },
        with: {
          stockItem: {
            columns: {
              quantity: true,
            },
          },
        },
      },
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    defaultPriceCents: product.defaultPriceCents,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceCents: variant.priceCents ?? product.defaultPriceCents,
      sku: variant.sku,
      availableQuantity: variant.stockTracking ? variant.stockItem?.quantity ?? 0 : null,
    })),
  }));
}

export async function resolveCartItems(cart: CartCookie): Promise<CartLineItem[]> {
  if (cart.items.length === 0) {
    return [];
  }

  if (!databaseAvailable()) {
    return cart.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      productName: 'Unbekannt',
      variantName: 'Unbekannt',
      unitPriceCents: 0,
      taxBand: 'standard',
      availableQuantity: null,
      stockTracking: false,
    }));
  }

  const db = getDatabase();
  const variantIds = cart.items.map((item) => item.variantId);
  const variants = await db.query.productVariants.findMany({
    where: (variant, { and, eq }) => and(eq(variant.isActive, true), inArray(variant.id, variantIds)),
    columns: {
      id: true,
      name: true,
      priceCents: true,
      stockTracking: true,
    },
    with: {
      product: {
        columns: {
          name: true,
          taxRate: true,
          defaultPriceCents: true,
        },
      },
      stockItem: {
        columns: {
          quantity: true,
        },
      },
    },
  });

  return cart.items
    .map((item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant || !variant.product) {
        return undefined;
      }

      const priceCents = variant.priceCents ?? variant.product.defaultPriceCents;
      const taxRatePercent = variant.product.taxRate ? Number(variant.product.taxRate) : 8.1;
      const taxBand = resolveTaxBandFromPercentage(taxRatePercent);

      return {
        variantId: item.variantId,
        quantity: item.quantity,
        productName: variant.product.name,
        variantName: variant.name,
        unitPriceCents: priceCents,
        taxBand,
        availableQuantity: variant.stockTracking ? variant.stockItem?.quantity ?? 0 : null,
        stockTracking: variant.stockTracking,
      } satisfies CartLineItem;
    })
    .filter((item): item is CartLineItem => Boolean(item));
}

export async function computeCart(cart: CartCookie): Promise<CartComputation> {
  const items = await resolveCartItems(cart);

  const totals = accumulateOrderTotals(
    items.map((item) => ({
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      taxBand: item.taxBand,
    })),
  );

  const cashRoundedTotalCents = applySwissCashRounding(totals.totalCents);

  return {
    items,
    totals: {
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      cashRoundedTotalCents,
    },
  };
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!databaseAvailable()) {
    return null;
  }

  const db = getDatabase();
  const product = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.slug, slug),
    columns: {
      id: true,
      name: true,
      slug: true,
      description: true,
      defaultPriceCents: true,
    },
    with: {
      variants: {
        where: (variant, { eq }) => eq(variant.isActive, true),
        columns: {
          id: true,
          name: true,
          priceCents: true,
          sku: true,
          stockTracking: true,
        },
        with: {
          stockItem: {
            columns: {
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    defaultPriceCents: product.defaultPriceCents,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceCents: variant.priceCents ?? product.defaultPriceCents,
      sku: variant.sku,
      availableQuantity: variant.stockTracking ? variant.stockItem?.quantity ?? 0 : null,
    })),
  };
}
