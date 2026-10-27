"use client";

import { AccessDenied } from "@/components/shared/access-denied";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

export function PermissionGate({
  permission,
  permissions,
  children,
  fallback = null,
  /** When true and access is denied, show a standard Access Denied panel. */
  showDenied = false,
}: {
  permission?: string;
  permissions?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDenied?: boolean;
}) {
  const { user } = useAuth();
  const allowed = permission
    ? hasPermission(user, permission)
    : permissions
      ? hasAnyPermission(user, permissions)
      : true;
  if (!allowed) {
    if (showDenied) return <AccessDenied />;
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
