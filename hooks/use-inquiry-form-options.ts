"use client";

import { useMemo } from "react";
import { api } from "@/lib/api";
import { fetchCustomers, formatPartyLabel } from "@/lib/party-fetch";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { UserAdmin, Item } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import type { ItemSearchOption } from "@/components/shared/item-search-select";

export function useInquiryFormOptions() {
  const { user } = useAuth();
  const canCustomers = hasPermission(user, "customers.read");
  const canAssignees = hasAnyPermission(user, [
    "users.read",
    "inquiries.read",
    "inquiries.write",
    "sales.write",
  ]);
  const canCatalog = hasAnyPermission(user, [
    "inquiries.read",
    "inquiries.write",
  ]);

  const {
    data: customers,
    loading: customersLoading,
    reload: reloadCustomers,
    setData: setCustomers,
  } = useFetch(() => fetchCustomers(), [], {
    enabled: canCustomers,
  });

  const { data: assignees } = useFetch(
    () => api<UserAdmin[]>("/users/assignees"),
    [],
    { enabled: canAssignees },
  );

  const { data: items, loading: itemsLoading } = useFetch(
    () =>
      fetchAllPages<Item>(
        (page, limit) => `/inquiries/catalog?page=${page}&limit=${limit}`,
      ),
    [],
    { enabled: canCatalog },
  );

  const customerOptions = useMemo(
    () =>
      (customers ?? [])
        .filter((c) => c.isActive !== false)
        .map((c) => ({ id: c.id, label: formatPartyLabel(c) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [customers],
  );

  const userOptions = useMemo(
    () =>
      (assignees ?? [])
        .filter((u) => u.isActive !== false)
        .map((u) => ({
          id: u.id,
          label: u.fullName || u.email,
        })),
    [assignees],
  );

  const itemOptions: ItemSearchOption[] = useMemo(
    () =>
      (items ?? []).map((item) => ({
        item,
        itemId: item.id,
        label: item.sku
          ? `${item.description} (${item.sku})`
          : item.description,
        itemType: item.itemType ?? null,
      })),
    [items],
  );

  return {
    customers: customers ?? [],
    customersLoading,
    customerOptions,
    userOptions,
    itemOptions,
    itemsLoading,
    reloadCustomers,
    setCustomers,
  };
}
