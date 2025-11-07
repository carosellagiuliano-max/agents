import { schema } from '@schnittwerk/db';

import { getDatabase } from './db';
import type { RequestActor } from './auth';

type AuditInput = {
  actor: RequestActor;
  action: string;
  targetTable: string;
  targetId?: string | null;
  description?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function recordAuditEvent(input: AuditInput): Promise<void> {
  const db = getDatabase();
  await db.insert(schema.auditLog).values({
    actorId: input.actor.id ?? null,
    actorType: 'user',
    action: input.action,
    targetTable: input.targetTable,
    targetId: input.targetId ?? null,
    description: input.description,
    changes: input.changes ?? {},
    metadata: { roles: input.actor.roles, ...(input.metadata ?? {}) },
    ipAddress: input.ipAddress ?? null,
  });
}
