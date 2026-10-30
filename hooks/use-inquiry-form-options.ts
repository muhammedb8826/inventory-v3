"use client";

import { useMemo } from "react";
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Customer, UserAdmin, Item } from "@/lib/types";
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
    reload: reloadCustomers,
    setData: setCustomers,
  } = useFetch(() => apiList<Customer>("/customers"), [], {
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
        .map((c) => ({ id: c.id, label: c.name })),
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
    customerOptions,
    userOptions,
    itemOptions,
    itemsLoading,
    reloadCustomers,
    setCustomers,
  };
}
