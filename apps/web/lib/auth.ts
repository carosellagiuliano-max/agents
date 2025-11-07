import type { NextRequest } from 'next/server';
import { headers as readHeaders } from 'next/headers';

export const ROLE_HEADER = 'x-schnittwerk-roles';
export const ACTOR_ID_HEADER = 'x-schnittwerk-actor-id';
export const STAFF_ID_HEADER = 'x-schnittwerk-staff-id';

export type RequestActor = {
  id?: string;
  staffId?: string;
  roles: string[];
};

function uniqueRoles(roles: string[]): string[] {
  return Array.from(new Set(roles.map((role) => role.toLowerCase())));
}

export function parseRolesHeader(raw: string | null): string[] {
  if (!raw) {
    return ['anonymous'];
  }

  const roles = raw
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);

  if (!roles.length) {
    return ['anonymous'];
  }

  return uniqueRoles(roles);
}

export function getRequestActorFromHeaders(source: Headers): RequestActor {
  const roles = parseRolesHeader(source.get(ROLE_HEADER));
  const id = source.get(ACTOR_ID_HEADER) ?? undefined;
  const staffId = source.get(STAFF_ID_HEADER) ?? undefined;

  return { id, staffId, roles };
}

export function getRequestActor(request: NextRequest): RequestActor {
  return getRequestActorFromHeaders(request.headers);
}

export function hasAnyRole(actor: RequestActor, allowed: Iterable<string>): boolean {
  const allowedSet = new Set(Array.from(allowed, (role) => role.toLowerCase()));
  if (!allowedSet.size) {
    return true;
  }

  return actor.roles.some((role) => allowedSet.has(role));
}

export function requireRole(actor: RequestActor, allowed: string[]): void {
  if (!hasAnyRole(actor, allowed)) {
    throw new Error('Forbidden');
  }
}

export function getCurrentActor(): RequestActor {
  return getRequestActorFromHeaders(readHeaders());
}

export function ensureCurrentActorRoles(allowed: string[]): RequestActor {
  const actor = getCurrentActor();
  requireRole(actor, allowed);
  return actor;
}

export function formatRoleList(roles: string[]): string {
  return roles
    .map((role) => role.trim())
    .filter(Boolean)
    .map((role) => role.charAt(0).toUpperCase() + role.slice(1))
    .join(', ');
}

