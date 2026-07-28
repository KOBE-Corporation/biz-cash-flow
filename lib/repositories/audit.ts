import { CURRENT_USER } from "@/lib/auth/current-user";
import { createId, getStore, touch } from "@/lib/mock/store";
import type { AuditAction, AuditLog } from "@/lib/types";

export type RecordAuditInput = {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  userName?: string;
};

/** Utilisateur courant pour les operations mock (stub auth). */
export function getActor() {
  const store = getStore();
  const byEmail = store.users.find((u) => u.email === CURRENT_USER.email);
  if (byEmail) return byEmail;
  const fallback = store.users[0];
  if (fallback) return fallback;
  const now = touch();
  const user = {
    id: CURRENT_USER.id,
    email: CURRENT_USER.email,
    name: CURRENT_USER.name,
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(user);
  return user;
}

export function recordAudit(input: RecordAuditInput): AuditLog {
  const actor = getActor();
  const entry: AuditLog = {
    id: createId("aud"),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: input.metadata,
    userId: input.userId ?? actor.id,
    userName: input.userName ?? actor.name,
    createdAt: touch(),
  };
  getStore().auditLogs.unshift(entry);
  return entry;
}

export function listAuditLogs(limit = 100) {
  return getStore().auditLogs.slice(0, limit);
}
