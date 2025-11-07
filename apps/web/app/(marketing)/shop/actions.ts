'use server';

import crypto from 'node:crypto';

import { eq, schema } from '@schnittwerk/db';
import { resolveTaxBandFromPercentage } from '@schnittwerk/lib';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getDatabase } from '@/lib/db';
import { getPaymentRegistry } from '@/lib/payments';
import { computeCart } from '@/lib/shop';

const CART_COOKIE = 'schnittwerk.cart';
const CART_PATHS = ['/shop', '/shop/cart', '/shop/checkout'];

export type CartCookie = {
  items: Array<{ variantId: string; quantity: number }>;
};

export type CartActionResult = {
  success: boolean;
  message?: string;
  requestId: string;
};

export type CheckoutActionResult = CartActionResult & {
  redirectUrl?: string;
  receiptUrl?: string;
  orderId?: string;
};

function createRequestId(): string {
  return crypto.randomUUID();
}

function readCartCookie(): CartCookie {
  const raw = cookies().get(CART_COOKIE)?.value;
  if (!raw) {
    return { items: [] };
  }

  try {
    const parsed = JSON.parse(raw) as CartCookie;
    if (!Array.isArray(parsed.items)) {
      return { items: [] };
    }
    return { items: parsed.items.filter((item) => typeof item.variantId === 'string' && typeof item.quantity === 'number') };
  } catch (error) {
    return { items: [] };
  }
}

function persistCart(cart: CartCookie): void {
  const secure = process.env.NODE_ENV === 'production';
  cookies().set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function ensureVariantExists(variantId: string) {
  const db = getDatabase();
  const variant = await db.query.productVariants.findFirst({
    where: (variants, { eq: eqVariant }) => eqVariant(variants.id, variantId),
    columns: {
      id: true,
      isActive: true,
      stockTracking: true,
    },
    with: {
      product: {
        columns: {
          id: true,
          isActive: true,
          taxRate: true,
          name: true,
          slug: true,
        },
      },
      stockItem: {
        columns: {
          quantity: true,
        },
      },
    },
  });

  if (!variant || !variant.isActive || !variant.product?.isActive) {
    throw new Error('Produkt ist nicht verfügbar.');
  }

  const taxRatePercent = variant.product.taxRate ? Number(variant.product.taxRate) : 8.1;
  const taxBand = resolveTaxBandFromPercentage(taxRatePercent);
  const availableQuantity = variant.stockTracking ? variant.stockItem?.quantity ?? 0 : Number.POSITIVE_INFINITY;

  return {
    id: variant.id,
    product: {
      id: variant.product.id,
      name: variant.product.name,
      slug: variant.product.slug,
    },
    stockTracking: variant.stockTracking,
    availableQuantity,
    taxBand,
  };
}

async function updateCartItemQuantity(variantId: string, quantity: number, replace: boolean): Promise<void> {
  const cart = readCartCookie();
  const variant = await ensureVariantExists(variantId);

  const existing = cart.items.find((item) => item.variantId === variantId);
  const newQuantity = replace ? quantity : (existing?.quantity ?? 0) + quantity;

  if (variant.stockTracking && newQuantity > variant.availableQuantity) {
    throw new Error('Nicht genügend Lagerbestand für diesen Artikel.');
  }

  const filteredItems = cart.items.filter((item) => item.variantId !== variantId);
  if (newQuantity > 0) {
    filteredItems.push({ variantId, quantity: newQuantity });
  }

  persistCart({ items: filteredItems });
}

function revalidateCart(): void {
  for (const path of CART_PATHS) {
    revalidatePath(path);
  }
}

const addSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20),
});

export async function addToCartAction(_: unknown, formData: FormData): Promise<CartActionResult> {
  const requestId = createRequestId();
  try {
    const { variantId, quantity } = addSchema.parse(Object.fromEntries(formData));
    await updateCartItemQuantity(variantId, quantity, false);
    revalidateCart();
    return { success: true, requestId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Konnte nicht zum Warenkorb hinzufügen.';
    return { success: false, message, requestId };
  }
}

const updateSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(99),
});

export async function updateCartAction(_: unknown, formData: FormData): Promise<CartActionResult> {
  const requestId = createRequestId();
  try {
    const { variantId, quantity } = updateSchema.parse(Object.fromEntries(formData));
    await updateCartItemQuantity(variantId, quantity, true);
    revalidateCart();
    return { success: true, requestId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Aktualisierung des Warenkorbs fehlgeschlagen.';
    return { success: false, message, requestId };
  }
}

const removeSchema = z.object({
  variantId: z.string().uuid(),
});

export async function removeFromCartAction(_: unknown, formData: FormData): Promise<CartActionResult> {
  const requestId = createRequestId();
  try {
    const { variantId } = removeSchema.parse(Object.fromEntries(formData));
    const cart = readCartCookie();
    const filtered = cart.items.filter((item) => item.variantId !== variantId);
    persistCart({ items: filtered });
    revalidateCart();
    return { success: true, requestId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Artikel konnte nicht entfernt werden.';
    return { success: false, message, requestId };
  }
}

export async function clearCartAction(): Promise<void> {
  persistCart({ items: [] });
  revalidateCart();
}

export async function getCartSnapshot(): Promise<CartCookie> {
  return readCartCookie();
}

export async function removeFromCartFormAction(formData: FormData): Promise<void> {
  await removeFromCartAction(undefined, formData);
}

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Bitte geben Sie Ihren Namen an.'),
  email: z.string().email('Bitte geben Sie eine gültige E-Mail an.'),
  paymentProvider: z.enum(['sumup', 'stripe']),
  notes: z.string().max(500).optional(),
});

export async function submitCheckoutAction(
  _: CheckoutActionResult,
  formData: FormData,
): Promise<CheckoutActionResult> {
  const requestId = createRequestId();
  try {
    const { fullName, email, paymentProvider, notes } = checkoutSchema.parse(Object.fromEntries(formData));
    const cartCookie = readCartCookie();
    const cart = await computeCart(cartCookie);

    if (cart.items.length === 0) {
      throw new Error('Ihr Warenkorb ist leer.');
    }

    const db = getDatabase();
    const orderId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(schema.orders).values({
        id: orderId,
        status: 'pending',
        totalCents: cart.totals.totalCents,
        taxCents: cart.totals.taxCents,
        notes,
        source: 'online',
      });

      if (cart.items.length > 0) {
        await tx.insert(schema.orderItems).values(
          cart.items.map((item) => ({
            orderId,
            variantId: item.variantId,
            description: `${item.productName} – ${item.variantName}`,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.unitPriceCents * item.quantity,
            metadata: { taxBand: item.taxBand },
          })),
        );
      }

      await tx.insert(schema.payments).values({
        id: paymentId,
        orderId,
        amountCents: cart.totals.totalCents,
        provider: paymentProvider,
        status: 'pending',
        metadata: { requestId, customerEmail: email },
      });
    });

    const registry = getPaymentRegistry();
    const paymentResult = await registry.createIntent(
      paymentProvider,
      {
        id: paymentId,
        amount: cart.totals.totalCents,
        description: `Online Bestellung ${orderId.slice(0, 8)}`,
        metadata: {
          orderId,
          customer: fullName,
          email,
        },
      },
      { currency: 'CHF', locale: 'de-CH', requestId },
    );

    if (paymentResult.status === 'requires_action') {
      await db
        .update(schema.payments)
        .set({ providerPaymentId: paymentResult.providerReference })
        .where(eq(schema.payments.id, paymentId));

      return {
        success: true,
        requestId,
        redirectUrl: paymentResult.redirectUrl,
        orderId,
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(schema.payments)
        .set({
          providerPaymentId: paymentResult.providerReference,
          status: 'captured',
          capturedAt: new Date(),
        })
        .where(eq(schema.payments.id, paymentId));

      await tx
        .update(schema.orders)
        .set({ status: 'paid', updatedAt: new Date() })
        .where(eq(schema.orders.id, orderId));
    });

    persistCart({ items: [] });
    revalidateCart();

    return {
      success: true,
      requestId,
      receiptUrl: paymentResult.receiptUrl,
      orderId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout fehlgeschlagen.';
    return { success: false, message, requestId };
  }
}
