'use client';

import { useFormStatus } from 'react-dom';

import { removeFromCartFormAction } from '@/app/(marketing)/shop/actions';

type RemoveFromCartFormProps = {
  variantId: string;
};

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="text-xs font-medium text-rose-600 transition hover:text-rose-700 disabled:cursor-progress disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? 'Entferne …' : 'Entfernen'}
    </button>
  );
}

export default function RemoveFromCartForm({ variantId }: RemoveFromCartFormProps) {
  return (
    <form action={removeFromCartFormAction} className="inline">
      <input name="variantId" type="hidden" value={variantId} />
      <RemoveButton />
    </form>
  );
}
