import { describe, expect, it } from 'vitest';

import { formatRoleList, hasAnyRole, parseRolesHeader } from '@/lib/auth';

describe('auth helpers', () => {
  it('parses roles header with defaults', () => {
    expect(parseRolesHeader(null)).toEqual(['anonymous']);
    expect(parseRolesHeader('Admin, Manager, admin')).toEqual(['admin', 'manager']);
  });

  it('checks if any allowed role is present', () => {
    const actor = { roles: ['admin', 'manager'] };
    expect(hasAnyRole(actor, ['owner'])).toBe(false);
    expect(hasAnyRole(actor, ['manager', 'stylist'])).toBe(true);
  });

  it('formats role list with capitalization', () => {
    expect(formatRoleList(['admin', 'manager'])).toBe('Admin, Manager');
  });
});
