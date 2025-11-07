'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de-CH">
      <body className="bg-slate-50 px-6 py-20 text-slate-900">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Uups, da ist etwas schiefgelaufen</h1>
          <p className="mt-3 text-sm text-slate-600">
            Unser Team wurde automatisch informiert. Bitte laden Sie die Seite neu oder versuchen Sie es später erneut. Bei
            anhaltenden Problemen erreichen Sie uns unter{' '}
            <a className="font-medium text-slate-900" href="mailto:hello@schnittwerk-vanessa.ch">
              hello@schnittwerk-vanessa.ch
            </a>
            .
          </p>
          <button
            className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            type="button"
            onClick={reset}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
