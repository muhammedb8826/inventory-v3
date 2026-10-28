"use client";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { ConfirmRecordAction } from "@/components/shared/confirm-record-action";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { AccessDenied } from "@/components/shared/access-denied";
import { PermissionGate } from "@/components/permission-gate";
import { FormField } from "@/components/shared/page-form";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/format";
import { buildRolesListPath } from "@/lib/list-query";
import { hasPermission } from "@/lib/permissions";
import {
  normalizeRolePermissions,
  rolePermissionCodes,
  rolePermissionIdsFromRole,
} from "@/lib/role-permissions";
import type { Permission, Role } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";

function permissionModule(code: string): string {
  const dot = code.indexOf(".");
  return dot > 0 ? code.slice(0, dot) : code;
}

function groupPermissions(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const groupKey = permissionModule(permission.code);
    const list = groups.get(groupKey) ?? [];
    list.push(permission);
    groups.set(groupKey, list);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupKey, items]) => ({
      groupKey,
      items: items.sort((a, b) => a.code.localeCompare(b.code)),
    }));
}

export default function RolesPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <AppShell title="Roles">
        <PageLoading />
      </AppShell>
    );
  }

  if (!hasPermission(user, "roles.read")) {
    return (
      <AppShell title="Roles">
        <AccessDenied />
      </AppShell>
    );
  }

  return <RolesPageContent />;
}

function RolesPageContent() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "roles.write");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { rows, meta, setPage, setLimit, loading, reload } =
    usePaginatedList<Role>(
      (page, limit) =>
        buildRolesListPath(
          {
            from: from || undefined,
            to: to || undefined,
            search: debouncedSearch || undefined,
          },
          page,
          limit,
        ),
      [from, to, debouncedSearch],
    );

  const activeFilterCount = useMemo(
    () => countActiveFilters([from, to]),
    [from, to],
  );

  function resetFilters() {
    setFrom("");
    setTo("");
  }

  return (
    <AppShell
      title="Roles"
      actions={
        canWrite ? <RoleDialog mode="create" onSuccess={reload} /> : null
      }
    >
      <DataCardTable
        storageKey="roles-list"
        rows={rows}
        loading={loading}
        emptyTitle="No roles"
        filters={
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder="Search roles..."
          />
        }
        toolbar={
          <TableFiltersSheet
            activeCount={activeFilterCount}
            onReset={resetFilters}
          >
            <FilterField label="Date range">
              <DateRangeFilter
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
                compact={false}
              />
            </FilterField>
          </TableFiltersSheet>
        }
        pagination={{
          meta,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        columns={[
          { key: "name", header: "Name", cell: (r) => r.name },
          {
            key: "desc",
            header: "Description",
            cell: (r) => r.description ?? "�",
          },
          {
            key: "perms",
            header: "Permissions",
            cell: (r) => (
              <div className="flex max-w-xl flex-wrap gap-1">
                {normalizeRolePermissions(r.permissions)
                  .slice(0, 6)
                  .map((p) => (
                    <Badge
                      key={p.id ?? p.code}
                      variant="secondary"
                      className="text-xs"
                    >
                      {p.code}
                    </Badge>
                  ))}
                {(r.permissions?.length ?? 0) > 6 ? (
                  <Badge variant="outline">
                    +{(r.permissions?.length ?? 0) - 6} more
                  </Badge>
                ) : null}
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-24 text-right",
            cell: (r) => (
              <PermissionGate permission="roles.write">
                <RoleRowActions role={r} onSuccess={reload} />
              </PermissionGate>
            ),
          },
        ]}
      />
    </AppShell>
  );
}

function RoleDialog({
  mode,
  role,
  onSuccess,
  defaultOpen = false,
  hideTrigger = false,
  onOpenChange,
}: {
  mode: "create" | "edit";
  role?: Role;
  onSuccess: () => void;
  defaultOpen?: boolean;
  hideTrigger?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const permissionsHydratedRef = useRef(false);

  const { data: catalog } = useFetch(
    () => api<Permission[]>("/permissions"),
    [],
    { enabled: open },
  );

  const filteredCatalog = useMemo(() => {
    const term = permSearch.trim().toLowerCase();
    const list = catalog ?? [];
    if (!term) return list;
    return list.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        (p.description?.toLowerCase().includes(term) ?? false),
    );
  }, [catalog, permSearch]);

  const permissionGroups = useMemo(
    () => groupPermissions(filteredCatalog),
    [filteredCatalog],
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (nextOpen) {
      permissionsHydratedRef.current = false;
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setPermSearch("");
      // Catalog may still be loading � permissions hydrate in the effect below.
      setSelectedIds(new Set());
    }
  }

  // Hydrate checked permissions once per open after the catalog loads.
  useEffect(() => {
    if (!open || !catalog?.length || permissionsHydratedRef.current) return;
    permissionsHydratedRef.current = true;
    if (mode === "edit" && role) {
      setSelectedIds(
        new Set(rolePermissionIdsFromRole(role.permissions, catalog)),
      );
    }
  }, [open, catalog, mode, role]);

  function togglePermission(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModule(modulePermissions: Permission[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const permission of modulePermissions) {
        if (checked) next.add(permission.id);
        else next.delete(permission.id);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name,
        description: description || undefined,
        permissionIds: Array.from(selectedIds),
      };
      if (mode === "create") {
        await api("/roles", { method: "POST", body });
        toast.success("Role created");
      } else if (role) {
        await api(`/roles/${role.id}`, { method: "PATCH", body });
        toast.success("Role updated");
      }
      setOpen(false);
      onOpenChange?.(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (defaultOpen) handleOpenChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen]);
  const selectedCount = selectedIds.size;
  const totalCount = catalog?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {mode === "create" ? (
            <Button type="button">
              <PlusIcon className="size-3.5" />
              Add role
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
            >
              <PencilIcon className="size-4" />
              <span className="sr-only">Edit</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-border bg-muted/40 px-5 py-4">
            <DialogTitle className="text-base font-semibold">
              {mode === "create" ? "New role" : `Edit ${role?.name}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {mode === "create"
                ? "Create a role and choose which permissions users with this role receive."
                : "Update the role name, description, or permission set. Saving replaces all assigned permissions."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Warehouse Manager"
                  required
                />
              </FormField>
              <FormField label="Description">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional summary"
                />
              </FormField>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Permissions
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {selectedCount} of {totalCount} selected
                    </p>
                  </div>
                  <div className="relative min-w-[180px] flex-1 sm:max-w-[240px]">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      placeholder="Search permissions…"
                      className="h-8 pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="max-h-[min(40vh,320px)] overflow-y-auto overscroll-contain">
                {permissionGroups.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {catalog?.length
                      ? "No permissions match your search."
                      : "Loading permissions…"}
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {permissionGroups.map(({ groupKey, items }) => {
                      const moduleSelected = items.filter((p) =>
                        selectedIds.has(p.id),
                      ).length;
                      const moduleChecked =
                        moduleSelected === items.length && items.length > 0;
                      const moduleIndeterminate =
                        moduleSelected > 0 && moduleSelected < items.length;
                      const moduleCheckboxId = `role-module-${groupKey}`;

                      return (
                        <div key={groupKey} className="px-4 py-3">
                          <div className="mb-2 flex items-center gap-2">
                            <Checkbox
                              id={moduleCheckboxId}
                              checked={
                                moduleIndeterminate
                                  ? "indeterminate"
                                  : moduleChecked
                              }
                              onCheckedChange={(checked) =>
                                toggleModule(items, checked === true)
                              }
                            />
                            <label
                              htmlFor={moduleCheckboxId}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {groupKey}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({moduleSelected}/{items.length})
                              </span>
                            </label>
                          </div>
                          <div className="space-y-2 pl-6">
                            {items.map((p) => {
                              const checkboxId = `role-perm-${p.id}`;
                              return (
                                <div
                                  key={p.id}
                                  className="flex items-start gap-2 rounded-sm py-0.5 text-sm hover:bg-muted/60"
                                >
                                  <Checkbox
                                    id={checkboxId}
                                    checked={selectedIds.has(p.id)}
                                    onCheckedChange={() =>
                                      togglePermission(p.id)
                                    }
                                  />
                                  <label
                                    htmlFor={checkboxId}
                                    className="min-w-0 cursor-pointer"
                                  >
                                    <span className="font-mono text-xs text-foreground">
                                      {p.code}
                                    </span>
                                    {p.description ? (
                                      <span className="mt-0.5 block text-xs text-muted-foreground">
                                        {p.description}
                                      </span>
                                    ) : null}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {mode === "edit" && role?.permissions?.length ? (
              <p className="text-xs text-muted-foreground">
                Previously assigned:{" "}
                {rolePermissionCodes(role.permissions).join(", ")}
              </p>
            ) : null}
          </div>

          <DialogFooter className="mt-0 shrink-0 gap-2 border-t border-border bg-muted/40 px-5 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? mode === "create"
                  ? "Creating…"
                  : "Saving…"
                : mode === "create"
                  ? "Create role"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleRowActions({
  role,
  onSuccess,
}: {
  role: Role;
  onSuccess: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  return (
    <>
      <RowActionsMenu
        label={role.name}
        actions={[
          {
            label: "Edit permissions",
            icon: PencilIcon,
            onSelect: () => setEdit(true),
          },
          {
            label: "Delete role",
            icon: Trash2Icon,
            destructive: true,
            onSelect: () => setRemove(true),
          },
        ]}
      />
      {edit && (
        <RoleDialog
          mode="edit"
          role={role}
          onSuccess={onSuccess}
          defaultOpen
          hideTrigger
          onOpenChange={setEdit}
        />
      )}
      <ConfirmRecordAction
        open={remove}
        onOpenChange={setRemove}
        title="Delete role?"
        description={`Users assigned to ${role.name} may lose access. Review assignments before deleting.`}
        label="Delete role"
        onConfirm={async () => {
          await api(`/roles/${role.id}`, { method: "DELETE" });
          toast.success("Role deleted");
          onSuccess();
        }}
      />
    </>
  );
}
