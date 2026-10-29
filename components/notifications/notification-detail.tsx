"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { dismissNotification, markNotificationRead } from "@/lib/notifications";
import {
  notificationHref,
  shortagePurchaseHref,
} from "@/lib/notification-routes";
import { errorMessage, formatDate, formatMoney } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import type { Notification } from "@/lib/types";
import { ExternalLinkIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const asNum = parseFloat(value);
    if (!Number.isNaN(asNum) && /^\d+(\.\d+)?$/.test(value.trim())) {
      return formatMoney(value);
    }
    return value;
  }
  return JSON.stringify(value);
}

export function NotificationDetail({
  notification,
  onUpdated,
}: {
  notification: Notification;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const entityHref = notificationHref(
    notification.entityType,
    notification.entityId
  );
  const purchaseHref = shortagePurchaseHref(
    notification.metadata,
    notification.entityType,
    notification.entityId
  );
  const canPurchase = hasPermission(user, "purchase.write");

  async function handleMarkRead() {
    if (notification.isRead) return;
    try {
      await markNotificationRead(notification.id);
      await refreshUnreadCount();
      onUpdated?.();
      toast.success("Marked as read");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function handleDismiss() {
    try {
      await dismissNotification(notification.id);
      await refreshUnreadCount();
      toast.success("Notification dismissed");
      router.push("/notifications");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const metadataEntries = Object.entries(notification.metadata ?? {});

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/notifications">← Back to list</Link>
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!notification.isRead ? (
            <Badge className="bg-primary/10 text-primary">Unread</Badge>
          ) : (
            <Badge variant="secondary">Read</Badge>
          )}
          <Badge variant="outline" className="capitalize">
            {notification.module.replace(/_/g, " ")}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {notification.type.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <PageFormCard>
        <PageFormSection title={notification.title}>
          <p className="text-sm leading-relaxed text-foreground">
            {notification.message}
          </p>
        </PageFormSection>

        <PageFormSection title="Details">
          <FormGrid>
            <DetailField
              label="Created"
              value={formatDate(notification.createdAt)}
            />
            <DetailField
              label="Read at"
              value={
                notification.readAt
                  ? formatDate(notification.readAt)
                  : "Not read yet"
              }
            />
            {notification.entityType ? (
              <DetailField
                label="Related type"
                value={notification.entityType.replace(/_/g, " ")}
              />
            ) : null}
            {notification.entityId ? (
              <DetailField
                label="Related ID"
                value={
                  <span className="font-mono text-xs">
                    {notification.entityId}
                  </span>
                }
              />
            ) : null}
          </FormGrid>

          {metadataEntries.length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Additional info
              </p>
              <FormGrid>
                {metadataEntries
                  .filter(
                    ([key]) =>
                      key !== "purchaseHref" && key !== "shortagesDetailed",
                  )
                  .map(([key, value]) => (
                    <DetailField
                      key={key}
                      label={key.replace(/_/g, " ")}
                      value={formatMetadataValue(value)}
                    />
                  ))}
              </FormGrid>
            </div>
          ) : null}
        </PageFormSection>

        <PageFormSection title="Actions">
          <div className="flex flex-wrap gap-2">
            {!notification.isRead ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleMarkRead()}
              >
                Mark as read
              </Button>
            ) : null}
            {purchaseHref && canPurchase ? (
              <Button type="button" size="sm" asChild>
                <Link href={purchaseHref}>Create purchase</Link>
              </Button>
            ) : null}
            {entityHref ? (
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href={entityHref}>
                  <ExternalLinkIcon className="size-3.5" />
                  {notification.entityType === "production_order"
                    ? "View production order"
                    : "View related record"}
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => void handleDismiss()}
            >
              <Trash2Icon className="size-3.5" />
              Dismiss
            </Button>
          </div>
        </PageFormSection>
      </PageFormCard>
    </div>
  );
}
