import type { PropsWithChildren } from 'react';
import type { Route } from 'next';
import Link from 'next/link';

import { Heading } from '@schnittwerk/ui';

import { formatRoleList, getCurrentActor, hasAnyRole } from '@/lib/auth';

const PORTAL_ROLES = ['owner', 'admin', 'manager', 'reception', 'stylist'];

type NavItem = {
  href: Route;
  label: string;
  description: string;
  roles: string[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Übersicht',
    description: 'Kennzahlen und aktuelle Aufgaben',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    href: '/admin/appointments',
    label: 'Kalender',
    description: 'Termine der nächsten Tage',
    roles: ['owner', 'admin', 'manager', 'reception', 'stylist'],
  },
  {
    href: '/admin/customers',
    label: 'Kund:innen',
    description: 'Profile, Einwilligungen, Export',
    roles: ['owner', 'admin', 'manager', 'reception'],
  },
  {
    href: '/admin/inventory',
    label: 'Inventur',
    description: 'Bestände, Zähllisten, CSV',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    href: '/admin/settings',
    label: 'Einstellungen',
    description: 'Öffnungszeiten, Team, Policies',
    roles: ['owner', 'admin'],
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    description: 'Umsatz, Auslastung, No-Show',
    roles: ['owner', 'admin', 'manager'],
  },
];

export default function AdminLayout({ children }: PropsWithChildren) {
  const actor = getCurrentActor();
  if (!hasAnyRole(actor, PORTAL_ROLES)) {
    return (
      <div className="mx-auto mt-16 max-w-3xl space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-900">
        <Heading level={1}>Zugriff verweigert</Heading>
        <p>
          Dieses Portal ist auf Teamrollen beschränkt. Benötigte Rollen: {formatRoleList(PORTAL_ROLES)}.
        </p>
      </div>
    );
  }

  const availableNav = NAV_ITEMS.filter((item) => hasAnyRole(actor, item.roles));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Heading className="text-2xl" level={2}>
              Schnittwerk Adminportal
            </Heading>
            <p className="text-xs text-slate-500">Angemeldet mit Rollen: {formatRoleList(actor.roles)}</p>
          </div>
          <nav aria-label="Admin Navigation">
            <ul className="flex flex-wrap gap-3 text-sm font-medium text-slate-700">
              {availableNav.map((item) => (
                <li key={item.href}>
                  <Link className="rounded-full border border-slate-200 px-4 py-1 transition hover:bg-slate-100" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        {availableNav.length === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <Heading className="text-lg" level={2}>
              Keine freigegebenen Bereiche
            </Heading>
            <p>
              Deine aktuelle Rolle ({formatRoleList(actor.roles) || 'ohne Rolle'}) besitzt keine Berechtigung für administrative
              Bereiche. Bitte wende dich an eine/n Administrator:in.
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
