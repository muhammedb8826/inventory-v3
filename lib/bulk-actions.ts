import { api } from '@/lib/api';
import { hasAnyPermission, hasPermission } from '@/lib/permissions';
import type { User } from '@/lib/types';
import type { BulkAction } from '@/components/shared/data-card-table';

type Row = { id: string; status?: unknown; isActive?: unknown; isRead?: unknown };
export function recordBulkActions<T extends { id: string }>(key: string | undefined, user: User | null): BulkAction<T>[] {
  const actions: BulkAction<T>[] = [];
  function add(
    id: string,
    label: string,
    permission: string | string[] | null,
    endpoint: string,
    method: string,
    suffix = '',
    body?: unknown,
    eligible?: (row: Row) => boolean,
    destructive = false,
  ) {
    if (permission) {
      const ok = Array.isArray(permission)
        ? hasAnyPermission(user, permission)
        : hasPermission(user, permission);
      if (!ok) return;
    }
    actions.push({ id, label, description: `${label} for the selected records.`, destructive, eligible,
      run: row => api(`${endpoint}/${encodeURIComponent(row.id)}${suffix}`, { method, body, idempotent: true }) });
  }
  if (key === 'sales-list' || key === 'purchases-list') {
    const endpoint = key === 'sales-list' ? '/sales' : '/purchases';
    add('void', 'Void selected', endpoint === '/sales' ? 'sales.write' : 'purchase.write', endpoint, 'DELETE', '', undefined, row => row.status !== 'VOIDED', true);
  }
  if (key?.startsWith('inventory-') && ['inventory-all', 'inventory-low'].includes(key)) {
    add('delete', 'Delete selected', 'inventory.delete', '/inventory', 'DELETE', '', undefined, undefined, true);
  }
  if (key === 'expenses-list') add('delete', 'Delete selected', 'expense.write', '/expenses', 'DELETE', '', undefined, undefined, true);
  if (key === 'stock-transfers-list') {
    add('ship', 'Ship selected', 'stock_transfer.write', '/stock-transfers', 'POST', '/ship', {}, row => row.status === 'PENDING');
    add('receive', 'Receive selected', 'stock_transfer.write', '/stock-transfers', 'POST', '/receive', {}, row => row.status === 'IN_TRANSIT');
    add('cancel', 'Cancel selected', 'stock_transfer.write', '/stock-transfers', 'DELETE', '', undefined, row => row.status === 'PENDING', true);
  }
  if (key === 'production-orders-list') {
    add('release', 'Release & reserve', 'production.write', '/production-orders', 'POST', '/release', {}, row => row.status === 'DRAFT');
    add('issue', 'Issue materials', ['production.issue', 'production.write'], '/production-orders', 'POST', '/issue', {}, row => ['RELEASED', 'IN_PROGRESS'].includes(String(row.status)));
    add('cancel', 'Cancel selected', 'production.write', '/production-orders', 'POST', '/cancel', {}, row => ['DRAFT', 'RELEASED'].includes(String(row.status)), true);
  }
  if (key === 'notifications-list') {
    add('read', 'Mark as read', null, '/notifications', 'PATCH', '/read', {}, row => !row.isRead);
    add('delete', 'Delete selected', null, '/notifications', 'DELETE', '', undefined, undefined, true);
  }
  if (key === 'users-list') {
    add('activate', 'Activate selected', 'users.write', '/users', 'PATCH', '', { isActive: true }, row => row.isActive === false);
    add('deactivate', 'Deactivate selected', 'users.write', '/users', 'POST', '/deactivate', {}, row => row.isActive !== false && row.id !== user?.id, true);
    add('delete', 'Delete selected', 'users.write', '/users', 'DELETE', '', undefined, row => row.id !== user?.id, true);
  }
  if (key === 'banks-accounts') {
    add('activate', 'Activate selected', 'bank.write', '/banks/accounts', 'POST', '/activate', {}, row => row.isActive === false);
    add('deactivate', 'Deactivate selected', 'bank.write', '/banks/accounts', 'POST', '/deactivate', {}, row => row.isActive !== false, true);
    add('delete', 'Delete selected', 'bank.write', '/banks/accounts', 'DELETE', '', undefined, undefined, true);
  }
  const master = key?.match(/^master-(\/(?:customers|suppliers|locations))$/)?.[1];
  if (master) {
    add('activate', 'Activate selected', `${master.slice(1)}.write`, master, 'PATCH', '', { isActive: true }, row => row.isActive === false);
    add('deactivate', 'Deactivate selected', `${master.slice(1)}.write`, master, 'PATCH', '', { isActive: false }, row => row.isActive !== false, true);
  }
  if (key === 'inquiries-list') {
    add('claim', 'Claim selected', 'inquiries.write', '/inquiries', 'POST', '/claim', {}, row => !['CLOSED', 'CANCELLED', 'CONVERTED'].includes(String(row.status)));
    add(
      'confirm',
      'Confirm quote',
      'inquiries.write',
      '/inquiries',
      'POST',
      '/confirm',
      {},
      row => ['NEW', 'IN_PROGRESS'].includes(String(row.status)),
    );
  }
  return actions;
}
