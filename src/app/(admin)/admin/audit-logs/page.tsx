'use client';

import { useState } from 'react';
import { useAdminData } from '@/components/admin/useAdminData';

interface AuditEvent {
  eventId: string;
  action: string;
  actorUid: string;
  actorRole: string;
  targetType: string;
  targetId: string | null;
  requestId: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState('');
  const [query, setQuery] = useState('/api/admin/audit-logs?limit=25');
  const { data, loading } = useAdminData<{ events: AuditEvent[] }>(query);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Audit logs</h1>
      <p className="text-sm text-gray-600">Append-only. Audit records cannot be edited or deleted.</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(action ? `/api/admin/audit-logs?action=${encodeURIComponent(action)}&limit=25` : '/api/admin/audit-logs?limit=25');
        }}
      >
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action (e.g. product.price_change)"
          className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm"
        />
        <button type="submit" className="h-9 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : !data || data.events.length === 0 ? (
        <p className="text-sm text-gray-500">No audit events.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="py-2">Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Request</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.eventId} className="border-b align-top">
                  <td className="py-2 text-gray-500">{e.createdAt.slice(0, 19).replace('T', ' ')}</td>
                  <td className="font-medium">{e.action}</td>
                  <td className="font-mono text-xs">{e.actorUid}</td>
                  <td className="text-gray-600">
                    {e.targetType}
                    {e.targetId ? `:${e.targetId}` : ''}
                  </td>
                  <td className="font-mono text-xs text-gray-400">{e.requestId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
