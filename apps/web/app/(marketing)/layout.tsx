import type { PropsWithChildren } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { Heading } from '@schnittwerk/ui';

const NAV_ITEMS: Array<{ href: Route; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Leistungen' },
  { href: '/about', label: 'Über uns' },
  { href: '/booking', label: 'Termin buchen' },
  { href: '/shop', label: 'Shop' },
];

export default function MarketingLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Heading className="text-2xl" level={2}>
            Schnittwerk
          </Heading>
          <nav aria-label="Hauptnavigation">
            <ul className="flex gap-4 text-sm font-medium text-slate-700">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link className="rounded px-2 py-1 transition hover:bg-slate-100" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
      <footer className="border-t border-slate-200 bg-white/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Schnittwerk by Vanessa Carosella</p>
          <div className="flex gap-4">
            <Link href="/privacy">Datenschutz</Link>
            <Link href="/imprint">Impressum</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
