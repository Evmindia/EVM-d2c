import 'server-only';

/**
 * Admin audit-log READER. Append-only: there is NO update/delete here or
 * anywhere in the admin API (Firestore rules also deny all client access).
 * Reads are bounded + filtered on allow-listed fields only.
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { AuditEventDTO } from './admin.dto';

const COLLECTION = 'audit_logs';
const MAX_PAGE = 50;

function docToEvent(id: string, d: DocumentData): AuditEventDTO {
  return {
    eventId: id,
    action: String(d.action ?? ''),
    actorUid: String(d.actorUid ?? ''),
    actorRole: String(d.actorRole ?? ''),
    targetType: String(d.resourceType ?? ''),
    targetId: d.resourceId != null ? String(d.resourceId) : null,
    requestId: d.requestId != null ? String(d.requestId) : null,
    metadata: (d.metadata as Record<string, unknown>) ?? {},
    createdAt: String(d.createdAt ?? ''),
  };
}

export interface AuditQuery {
  limit: number;
  actorUid?: string;
  action?: string;
  targetType?: string;
  requestId?: string;
}

/**
 * List audit events (most recent first) with allow-listed equality filters and
 * a hard page cap. Only ONE equality filter is applied to avoid requiring many
 * composite indexes; additional narrowing is applied in-memory on the bounded
 * page. Never accepts arbitrary field names/operators from the client.
 */
export async function listAuditEvents(query: AuditQuery): Promise<AuditEventDTO[]> {
  const limit = Math.min(Math.max(1, query.limit), MAX_PAGE);
  let q: FirebaseFirestore.Query = adminDb().collection(COLLECTION);

  // Apply the most selective single equality filter server-side.
  if (query.requestId) q = q.where('requestId', '==', query.requestId);
  else if (query.actorUid) q = q.where('actorUid', '==', query.actorUid);
  else if (query.action) q = q.where('action', '==', query.action);
  else if (query.targetType) q = q.where('resourceType', '==', query.targetType);

  const snap = await q.orderBy('createdAt', 'desc').limit(limit).get();
  let events = snap.docs.map((d) => docToEvent(d.id, d.data()));

  // In-memory narrowing for any remaining allow-listed filters (bounded page).
  if (query.actorUid) events = events.filter((e) => e.actorUid === query.actorUid);
  if (query.action) events = events.filter((e) => e.action === query.action);
  if (query.targetType) events = events.filter((e) => e.targetType === query.targetType);

  return events;
}
