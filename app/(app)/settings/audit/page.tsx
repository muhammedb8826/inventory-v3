"use client";
import { AppShell } from '@/components/app-shell';
import { PermissionGate } from '@/components/permission-gate';
import { DataCardTable } from '@/components/shared/data-card-table';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { buildListPath } from '@/lib/list-query';
import { formatDate } from '@/lib/format';
type AuditEvent = { id: string; actor_id: string | null; method: string; route: string; resource_id: string | null; request_id: string | null; status_code: number; created_at: string; changes: unknown };
export default function AuditPage() {
  const { rows, meta, setPage, setLimit, loading } = usePaginatedList<AuditEvent>((page, limit) => buildListPath('/audit-events', { page, limit }), []);
  return <AppShell title="Audit trail" subtitle="Immutable database changes and the operators who submitted requests." breadcrumbs={[{ label:'Settings', href:'/settings/branding' },{ label:'Audit trail' }]}>
    <PermissionGate permission="settings.read" showDenied><DataCardTable storageKey="audit-events" rows={rows} loading={loading} pagination={{ meta, onPageChange:setPage, onLimitChange:setLimit }} columns={[
      { key:'created_at', header:'Recorded', cell:r => formatDate(r.created_at) },
      { key:'method', header:'Operation', cell:r => <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">{r.method}</span> },
      { key:'route', header:'Resource', cell:r => r.route },
      { key:'resource_id', header:'Record', cell:r => <span className="font-mono text-xs">{r.resource_id ?? '?'}</span> },
      { key:'actor_id', header:'Actor', cell:r => r.actor_id ?? 'Database change' },
      { key:'status_code', header:'Result', cell:r => r.status_code },
      { key:'request_id', header:'Request', cell:r => r.request_id ?? '?', defaultVisible:false },
      { key:'changes', header:'Changes', cell:r => r.changes ? <details><summary className="cursor-pointer text-primary">View changes</summary><pre className="mt-2 max-h-64 max-w-md overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{JSON.stringify(r.changes,null,2)}</pre></details> : 'Request metadata' },
    ]} /></PermissionGate>
  </AppShell>;
}
