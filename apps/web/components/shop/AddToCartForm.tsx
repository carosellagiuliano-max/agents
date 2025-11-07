'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import type { CartActionResult } from '@/app/(marketing)/shop/actions';
import { addToCartAction } from '@/app/(marketing)/shop/actions';

type AddToCartFormProps = {
  variantId: string;
  disabled?: boolean;
  availableQuantity?: number;
};

const INITIAL_STATE: CartActionResult = {
  success: false,
  requestId: '',
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      aria-disabled={disabled || pending}
      className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? 'Wird hinzugefügt …' : 'In den Warenkorb'}
    </button>
  );
}

export default function AddToCartForm({ variantId, disabled, availableQuantity }: AddToCartFormProps) {
  const [formState, formAction] = useFormState(addToCartAction, INITIAL_STATE);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!formState.requestId) {
      return;
    }

    if (!formState.success) {
      setMessage(formState.message ?? 'Der Artikel konnte nicht hinzugefügt werden.');
    } else {
      setMessage(undefined);
    }
  }, [formState]);

  return (
    <form action={formAction} className="space-y-3">
      <input name="variantId" type="hidden" value={variantId} />
      <label className="flex items-center justify-between text-xs text-slate-600">
        <span>Anzahl</span>
        <input
          className="w-16 rounded-full border border-slate-200 px-3 py-1 text-right text-sm"
          defaultValue={1}
          max={availableQuantity ?? 99}
          min={1}
          name="quantity"
          type="number"
        />
      </label>
      {message ? <p className="text-xs text-rose-600" role="alert">{message}</p> : null}
      <SubmitButton disabled={disabled} />
    </form>
  );
}
