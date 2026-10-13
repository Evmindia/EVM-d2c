import 'server-only';

/**
 * Append-only audit logging for sensitive admin/superadmin operations.
 *
 * Writes to the server-only `audit_logs` collection (client access denied by
 * Firestore rules). Records who did what to which resource, with before/after
 * snapshots where relevant. Sensitive values are never recorded here — callers
 * must pass already-safe metadata.
 */
import { adminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

export type AuditAction =
  | 'product.create'
  | 'product.update'
  | 'product.price_change'
  | 'product.activate'
  | 'product.deactivate'
  | 'product.delete'
  | 'category.create'
  | 'category.update'
  | 'inventory.adjust'
  | 'order.update'
  | 'order.view'
  | 'order.cancel'
  | 'customer.status_change'
  | 'refund.create'
  | 'coupon.create'
  | 'review.moderate'
  | 'user.role_change'
  | 'staff.create'
  | 'staff.update'
  | 'staff.delete'
  | 'admin.login'
  | 'admin.denied';

export interface AuditEntry {
  action: AuditAction;
  actorUid: string;
  actorRole: string;
  resourceType: string;
  resourceId?: string;
  ip?: string;
  /** Correlation id from the API request, for troubleshooting. */
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record an audit event. Best-effort: a logging failure must not break the
 * underlying operation, but is surfaced to server logs.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await adminDb()
      .collection('audit_logs')
      .add({
        ...entry,
        createdAt: new Date().toISOString(),
      });
  } catch (err) {
    logger.error('audit_write_failed', { action: entry.action, err: String(err) });
  }
}
