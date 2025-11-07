'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import type { CartActionResult } from '@/app/(marketing)/shop/actions';
import { updateCartAction } from '@/app/(marketing)/shop/actions';

type CartQuantityFormProps = {
  variantId: string;
  quantity: number;
  max?: number;
};

const INITIAL_STATE: CartActionResult = {
  success: true,
  requestId: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? 'Aktualisiere …' : 'Aktualisieren'}
    </button>
  );
}

export default function CartQuantityForm({ variantId, quantity, max }: CartQuantityFormProps) {
  const [state, action] = useFormState(updateCartAction, INITIAL_STATE);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!state.requestId) {
      return;
    }

    if (!state.success) {
      setMessage(state.message ?? 'Die Menge konnte nicht geändert werden.');
    } else {
      setMessage(undefined);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-2">
      <input name="variantId" type="hidden" value={variantId} />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        Menge
        <input
          className="w-16 rounded-full border border-slate-200 px-3 py-1 text-right text-sm"
          defaultValue={quantity}
          max={max ?? 99}
          min={0}
          name="quantity"
          type="number"
        />
      </label>
      {message ? <p className="text-xs text-rose-600" role="alert">{message}</p> : null}
      <SubmitButton />
    </form>
  );
}
