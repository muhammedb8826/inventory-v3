"use client";

import { useState } from "react";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { AccessDenied } from "@/components/shared/access-denied";
import { PermissionGate } from "@/components/permission-gate";
import { FormField, FormGrid } from "@/components/shared/page-form";
import { ListSearchField } from "@/components/shared/list-search-field";
import { TableFiltersSheet } from "@/components/shared/table-filters-sheet";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AppModal } from "@/components/shared/app-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buildListPath, type ListQueryParams } from "@/lib/list-query";
import { errorMessage } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { toast } from "sonner";
import { PencilIcon, PlusIcon } from "lucide-react";

export interface MasterField {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea" | "select";
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export function MasterDataPage<
  T extends { id: string; name: string; isActive?: boolean },
>({
  title,
  endpoint,
  readPermission,
  writePermission,
  fields,
  columns,
  emptyDescription,
  supportsActive = false,
  listParams,
  filterExtras,
  filterActiveCount = 0,
  onResetFilters,
  resetOnCreate = false,
}: {
  title: string;
  endpoint: string;
  readPermission: string;
  writePermission: string;
  fields: MasterField[];
  columns: { key: string; header: string; cell: (row: T) => React.ReactNode }[];
  emptyDescription?: string;
  supportsActive?: boolean;
  listParams?: ListQueryParams;
  filterExtras?: React.ReactNode;
  filterActiveCount?: number;
  onResetFilters?: () => void;
  resetOnCreate?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const canRead = hasPermission(user, readPermission);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const listParamsKey = JSON.stringify(listParams ?? {});

  const { rows, meta, setPage, setLimit, loading, reload } =
    usePaginatedList<T>(
      (page, limit) =>
        canRead
          ? buildListPath(endpoint, {
              params: {
                ...listParams,
                search: debouncedSearch || undefined,
              },
              page,
              limit,
            })
          : null,
      [canRead, endpoint, debouncedSearch, listParamsKey],
    );

  if (authLoading) {
    return (
      <AppShell title={title}>
        <PageLoading />
      </AppShell>
    );
  }

  if (!canRead) {
    return (
      <AppShell title={title}>
        <AccessDenied />
      </AppShell>
    );
  }

  const tableColumns = [
    ...columns,
    ...fields
      .filter((field) => !columns.some((column) => column.key === field.name))
      .map((field) => ({
        key: field.name,
        header: field.label,
        defaultVisible: false,
        cell: (row: T) =>
          String(
            (row as unknown as Record<string, unknown>)[field.name] ?? "\u2014",
          ),
      })),
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (row: T) => (
        <PermissionGate permission={writePermission}>
          <MasterRowActions
            title={title}
            endpoint={endpoint}
            fields={fields}
            row={row}
            supportsActive={supportsActive}
            onSuccess={reload}
          />
        </PermissionGate>
      ),
    },
  ];

  return (
    <AppShell
      title={title}
      subtitle={`Manage ${title.toLowerCase()}`}
      breadcrumbs={[{ label: "Stock", href: "/dashboard" }, { label: title }]}
      actions={
        <PermissionGate permission={writePermission}>
          <CreateDialog
            title={title}
            endpoint={endpoint}
            fields={fields}
            onSuccess={() => {
              if (resetOnCreate) {
                setSearch("");
                setPage(1);
              }
              void reload();
            }}
          />
        </PermissionGate>
      }
    >
      <DataCardTable
        storageKey={`master-${endpoint}`}
        rows={rows}
        loading={loading}
        emptyTitle="Nothing to show"
        emptyDescription={emptyDescription}
        filters={
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder={`Search ${title.toLowerCase()}...`}
          />
        }
        toolbar={
          filterExtras ? (
            <TableFiltersSheet
              activeCount={filterActiveCount}
              onReset={onResetFilters ?? (() => undefined)}
            >
              {filterExtras}
            </TableFiltersSheet>
          ) : undefined
        }
        pagination={{
          meta,
          onPageChange: setPage,
          onLimitChange: setLimit,
          disabled: loading,
        }}
        columns={tableColumns}
      />
    </AppShell>
  );
}

function MasterFieldsForm({
  fields,
  values,
  setValues,
  supportsActive,
  isEdit,
}: {
  fields: MasterField[];
  values: Record<string, string | boolean>;
  setValues: React.Dispatch<
    React.SetStateAction<Record<string, string | boolean>>
  >;
  supportsActive?: boolean;
  isEdit?: boolean;
}) {
  return (
    <FormGrid cols={1}>
      {fields.map((f) => (
        <FormField
          key={f.name}
          label={f.label}
          required={f.required}
          htmlFor={f.name}
          hint={f.hint}
        >
          {f.type === "textarea" ? (
            <Textarea
              id={f.name}
              value={(values[f.name] as string) ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.name]: e.target.value }))
              }
            />
          ) : f.type === "select" && f.options ? (
            <Select
              value={(values[f.name] as string) ?? ""}
              onValueChange={(v) =>
                setValues((prev) => ({ ...prev, [f.name]: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${f.label}`} />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={f.name}
              type={f.type === "email" || f.type === "tel" ? f.type : "text"}
              autoComplete={f.type === "tel" ? "tel" : undefined}
              maxLength={f.type === "tel" ? 50 : undefined}
              required={f.required}
              value={(values[f.name] as string) ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.name]: e.target.value }))
              }
            />
          )}
        </FormField>
      ))}
      {supportsActive && isEdit ? (
        <div className="flex items-center gap-2">
          <Switch
            id="isActive"
            checked={values.isActive !== false}
            onCheckedChange={(checked) =>
              setValues((v) => ({ ...v, isActive: checked }))
            }
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      ) : null}
    </FormGrid>
  );
}

function buildBody(
  fields: MasterField[],
  values: Record<string, string | boolean>,
  supportsActive: boolean,
  isEdit: boolean,
) {
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (typeof v === "string" && v) body[f.name] = v;
  }
  if (supportsActive && isEdit) {
    body.isActive = values.isActive !== false;
  }
  return body;
}

function rowToValues<T extends { id: string; isActive?: boolean }>(
  row: T,
  fields: MasterField[],
) {
  const values: Record<string, string | boolean> = {};
  for (const f of fields) {
    const v = (row as Record<string, unknown>)[f.name];
    if (v != null) values[f.name] = String(v);
  }
  if ("isActive" in row) values.isActive = row.isActive !== false;
  return values;
}

function CreateDialog({
  title,
  endpoint,
  fields,
  onSuccess,
}: {
  title: string;
  endpoint: string;
  fields: MasterField[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(endpoint, {
        method: "POST",
        body: buildBody(fields, values, false, false),
      });
      toast.success("Created");
      setOpen(false);
      setValues({});
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const formId = "master-create-form";

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" />
        New
      </Button>
      <AppModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setValues({});
        }}
        title={`New ${title}`}
        description="Fill in the details below. Fields marked with * are required."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <MasterFieldsForm
            fields={fields}
            values={values}
            setValues={setValues}
          />
        </form>
      </AppModal>
    </>
  );
}

function EditDialog<
  T extends { id: string; name: string; isActive?: boolean },
>({
  title,
  endpoint,
  fields,
  row,
  supportsActive,
  onSuccess,
  defaultOpen = false,
  hideTrigger = false,
  onOpenChange,
}: {
  title: string;
  endpoint: string;
  fields: MasterField[];
  row: T;
  supportsActive?: boolean;
  onSuccess: () => void;
  defaultOpen?: boolean;
  hideTrigger?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    rowToValues(row, fields),
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`${endpoint}/${row.id}`, {
        method: "PATCH",
        body: buildBody(fields, values, !!supportsActive, true),
      });
      toast.success("Updated");
      setOpen(false);
      onOpenChange?.(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const formId = `master-edit-form-${row.id}`;

  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => {
            setValues(rowToValues(row, fields));
            setOpen(true);
            onOpenChange?.(true);
          }}
        >
          <PencilIcon className="size-4" />
          <span className="sr-only">Edit</span>
        </Button>
      )}
      <AppModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
          if (next) setValues(rowToValues(row, fields));
        }}
        title={`Edit ${row.name}`}
        description="Update the details below, then save."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                onOpenChange?.(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <MasterFieldsForm
            fields={fields}
            values={values}
            setValues={setValues}
            supportsActive={supportsActive}
            isEdit
          />
        </form>
      </AppModal>
    </>
  );
}

function MasterRowActions<
  T extends { id: string; name: string; isActive?: boolean },
>(props: {
  title: string;
  endpoint: string;
  fields: MasterField[];
  row: T;
  supportsActive?: boolean;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <RowActionsMenu
        label={props.row.name}
        actions={[
          {
            label: "Edit details",
            icon: PencilIcon,
            onSelect: () => setOpen(true),
          },
        ]}
      />
      {open && (
        <EditDialog {...props} defaultOpen hideTrigger onOpenChange={setOpen} />
      )}
    </>
  );
}
