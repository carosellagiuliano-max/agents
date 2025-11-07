'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import type { CheckoutActionResult } from '@/app/(marketing)/shop/actions';
import { submitCheckoutAction } from '@/app/(marketing)/shop/actions';

type CheckoutFormProps = {
  totalCents: number;
};

const INITIAL_STATE: CheckoutActionResult = {
  success: true,
  requestId: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
      disabled={pending}
      type="submit"
    >
      {pending ? 'Weiter zur Zahlung …' : 'Verbindlich bestellen'}
    </button>
  );
}

export default function CheckoutForm({ totalCents }: CheckoutFormProps) {
  const [state, formAction] = useFormState(submitCheckoutAction, INITIAL_STATE);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!state.requestId) {
      return;
    }

    if (!state.success) {
      setMessage(state.message ?? 'Checkout fehlgeschlagen.');
      return;
    }

    if (state.redirectUrl) {
      window.location.assign(state.redirectUrl);
      return;
    }

    if (state.receiptUrl) {
      setMessage('Bestellung abgeschlossen. Die Quittung wurde per E-Mail gesendet.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-900" htmlFor="fullName">
          Vor- und Nachname
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          id="fullName"
          name="fullName"
          placeholder="Vanessa Carosella"
          required
          type="text"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-900" htmlFor="email">
          E-Mail für Bestätigung
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          id="email"
          inputMode="email"
          name="email"
          placeholder="sie@example.ch"
          required
          type="email"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-900">Bezahlmethode</legend>
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 text-sm">
          <span>SumUp Online Checkout</span>
          <input defaultChecked name="paymentProvider" type="radio" value="sumup" />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 text-sm">
          <span>Stripe Kreditkarte</span>
          <input name="paymentProvider" type="radio" value="stripe" />
        </label>
      </fieldset>
      <div>
        <label className="block text-sm font-medium text-slate-900" htmlFor="notes">
          Anmerkungen (optional)
        </label>
        <textarea
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          id="notes"
          maxLength={500}
          name="notes"
          placeholder="Lieferhinweise oder Besonderheiten"
          rows={4}
        />
      </div>
      <p className="text-sm text-slate-600">
        Gesamtbetrag: <span className="font-semibold text-slate-900">{new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(totalCents / 100)}</span>
      </p>
      {message ? <p className="text-sm text-emerald-700" role="status">{message}</p> : null}
      <SubmitButton />
    </form>
  );
}
