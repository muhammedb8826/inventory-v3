"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { apiList } from "@/lib/list-response";
import { errorMessage } from "@/lib/format";
import { buildUsersListPath } from "@/lib/list-query";
import { hasPermission } from "@/lib/permissions";
import type { Role, UserAdmin } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { AccessDenied } from "@/components/shared/access-denied";

export default function UsersPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppShell title="Users">
        <PageLoading />
      </AppShell>
    );
  }

  if (!hasPermission(user, "users.read")) {
    return (
      <AppShell title="Users">
        <AccessDenied />
      </AppShell>
    );
  }

  return <UsersPageContent />;
}

function UsersPageContent() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "users.write");
  const canLoadRoles = canWrite || hasPermission(user, "roles.read");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [roleId, setRoleId] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: roles } = useFetch(() => apiList<Role>("/roles"), [], {
    enabled: canLoadRoles,
  });
  const { rows, meta, setPage, setLimit, loading, reload } =
    usePaginatedList<UserAdmin>(
      (page, limit) =>
        buildUsersListPath(
          {
            from: from || undefined,
            to: to || undefined,
            search: debouncedSearch || undefined,
            roleId: roleId || undefined,
            isActive: activeFilter ? activeFilter === "true" : undefined,
          },
          page,
          limit,
        ),
      [from, to, debouncedSearch, roleId, activeFilter],
    );

  const activeFilterCount = useMemo(
    () => countActiveFilters([from, to, roleId, activeFilter]),
    [from, to, roleId, activeFilter],
  );

  function resetFilters() {
    setFrom("");
    setTo("");
    setRoleId("");
    setActiveFilter("");
  }

  return (
    <AppShell
      title="Users"
      actions={
        canWrite ? <UserDialog mode="create" onSuccess={reload} /> : null
      }
    >
      <DataCardTable
        storageKey="users-list"
        rows={rows}
        loading={loading}
        emptyTitle="No users"
        filters={
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder="Search users..."
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
            <FilterField label="Role">
              <Select
                value={roleId || "__all__"}
                onValueChange={(v) => setRoleId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All roles</SelectItem>
                  {(roles ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Status">
              <Select
                value={activeFilter || "__all__"}
                onValueChange={(v) =>
                  setActiveFilter(
                    v === "__all__" ? "" : (v as "true" | "false"),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All users</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </TableFiltersSheet>
        }
        pagination={{
          meta,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        columns={[
          { key: "name", header: "Name", cell: (r) => r.fullName },
          { key: "email", header: "Email", cell: (r) => r.email },
          {
            key: "role",
            header: "Role",
            cell: (r) => r.role?.name ?? "�",
          },
          {
            key: "actions",
            header: "",
            className: "w-24 text-right",
            cell: (r) =>
              canWrite ? (
                <div className="flex justify-end gap-1">
                  <UserDialog mode="edit" user={r} onSuccess={reload} />
                  <DeleteUserButton user={r} onSuccess={reload} />
                </div>
              ) : null,
          },
        ]}
      />
    </AppShell>
  );
}

function UserDialog({
  mode,
  user,
  onSuccess,
}: {
  mode: "create" | "edit";
  user?: UserAdmin;
  onSuccess: () => void;
}) {
  const { user: me, refreshUser } = useAuth();
  const canLoadRoles =
    hasPermission(me, "users.write") || hasPermission(me, "roles.read");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [roleId, setRoleId] = useState(user?.roleId ?? user?.role?.id ?? "");
  const [locationIds, setLocationIds] = useState<string[]>(
    user?.locationIds ?? [],
  );
  const [saving, setSaving] = useState(false);
  const { data: roles } = useFetch(() => apiList<Role>("/roles"), [], {
    enabled: open && canLoadRoles,
  });
  const { data: locations } = useLocations();
  const { data: detail } = useFetch(
    () =>
      mode === "edit" && user?.id && open
        ? api<UserAdmin>(`/users/${user.id}`)
        : Promise.resolve(null),
    [mode, user?.id, open],
  );

  useEffect(() => {
    if (open && detail?.locationIds) {
      setLocationIds(detail.locationIds);
    }
  }, [open, detail]);

  function toggleLocation(id: string) {
    setLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleId) {
      toast.error("Select a role");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await api("/users", {
          method: "POST",
          body: { email, password, fullName, roleId, locationIds },
        });
        toast.success("User created");
      } else if (user) {
        const previousRoleId = user.roleId ?? user.role?.id ?? "";
        const body: {
          fullName: string;
          roleId: string;
          password?: string;
          locationIds: string[];
        } = { fullName, roleId, locationIds };
        if (password) body.password = password;
        await api(`/users/${user.id}`, { method: "PATCH", body });
        toast.success("User updated");
        if (me?.id === user.id && roleId !== previousRoleId) {
          await refreshUser();
          toast.message("Your permissions were refreshed for the new role.");
        }
      }
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setEmail(user?.email ?? "");
          setPassword("");
          setFullName(user?.fullName ?? "");
          setRoleId(user?.roleId ?? user?.role?.id ?? "");
          setLocationIds(user?.locationIds ?? []);
        }
      }}
    >
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm">
            <PlusIcon />
            Add user
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon" className="size-8">
            <PencilIcon className="size-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "New user" : `Edit ${user?.fullName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            {mode === "create" ? (
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={email} disabled />
              </div>
            )}
            <div className="grid gap-2">
              <Label>
                {mode === "create" ? "Password" : "New password (optional)"}
              </Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "create"
                    ? "At least 8 characters"
                    : "Leave blank to keep current"
                }
                required={mode === "create"}
                minLength={mode === "create" ? 8 : undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={roleId || undefined} onValueChange={setRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(roles ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Location access</Label>
              <p className="text-xs text-muted-foreground">
                Users with no assignments cannot access locations. Roles with
                locations.all always see everything.
              </p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {(locations ?? [])
                  .filter((l) => l.type !== "BIN")
                  .map((l) => (
                    <label
                      key={l.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={locationIds.includes(l.id)}
                        onChange={() => toggleLocation(l.id)}
                      />
                      {l.name}
                    </label>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !roleId}>
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserButton({
  user,
  onSuccess,
}: {
  user: UserAdmin;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete user "${user.fullName}" (${user.email})?`)) return;
    setDeleting(true);
    try {
      await api(`/users/${user.id}`, { method: "DELETE" });
      toast.success("User deleted");
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-destructive"
      disabled={deleting}
      onClick={handleDelete}
    >
      <Trash2Icon className="size-4" />
      <span className="sr-only">Delete</span>
    </Button>
  );
}
