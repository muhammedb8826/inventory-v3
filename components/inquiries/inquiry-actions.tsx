"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, PencilIcon } from "lucide-react";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/shared/row-actions-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { FormField, FormGrid } from "@/components/shared/page-form";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { fetchAllLocations } from "@/lib/fetch-all-locations";
import { errorMessage } from "@/lib/format";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import {
  inquiryReference,
  inquiryWorkflow,
  INQUIRY_ACTION_LABELS,
  type InquiryAction,
} from "@/lib/inquiry-workflow";
import type { Inquiry, ProductionOrder } from "@/lib/types";
import { toast } from "sonner";

export function InquiryActions({
  inquiry,
  onChanged,
  compact = false,
}: {
  inquiry: Inquiry;
  onChanged: () => void;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const workflow = inquiryWorkflow(inquiry, user);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<InquiryAction | null>(
    null,
  );
  const [produce, setProduce] = useState(false);
  async function run(action: InquiryAction) {
    setBusy(true);
    try {
      await api(
        `/inquiries/${inquiry.id}${action === "cancel" ? "" : `/${action}`}`,
        { method: action === "cancel" ? "DELETE" : "POST" },
      );
      setConfirmAction(null);
      requestNotificationsRefresh();
      onChanged();
      toast.success(
        (
          {
            claim: "Inquiry claimed",
            accept: "Assignment accepted",
            decline: "Assignment declined",
            confirm: "Requirements confirmed",
            close: "Inquiry closed",
            cancel: "Inquiry cancelled",
          } as Partial<Record<InquiryAction, string>>
        )[action] ?? "Inquiry updated",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function select(action: InquiryAction) {
    if (busy) return;
    if (action === "sale" || action === "sale-link")
      router.push(
        action === "sale"
          ? `/sales/new?inquiryId=${encodeURIComponent(inquiry.id)}`
          : `/sales/${inquiry.convertedSaleId}`,
      );
    else if (action === "production") setProduce(true);
    else if (["cancel", "close", "confirm"].includes(action))
      setConfirmAction(action);
    else void run(action);
  }
  const menu: RowAction[] = [
    ...(compact
      ? [
          {
            label: "View details",
            href: `/inquiries/${inquiry.id}`,
            icon: EyeIcon,
          },
        ]
      : []),
    ...(workflow.canEdit && compact
      ? [
          {
            label: "Edit inquiry",
            href: `/inquiries/${inquiry.id}/edit`,
            icon: PencilIcon,
            disabled: busy,
          },
        ]
      : []),
    ...workflow.actions
      .filter((a) => compact || a !== workflow.primary)
      .map((action) => ({
        label: INQUIRY_ACTION_LABELS[action],
        onSelect: () => select(action),
        disabled: busy,
        destructive: action === "cancel",
      })),
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2" aria-busy={busy}>
        {!compact && workflow.primary && (
          <Button
            type="button"
            disabled={busy}
            onClick={() => select(workflow.primary!)}
          >
            {busy ? "Working…" : INQUIRY_ACTION_LABELS[workflow.primary]}
          </Button>
        )}
        <RowActionsMenu
          label={inquiryReference(inquiry)}
          description={inquiry.subject}
          actions={menu}
        />
      </div>
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction
                ? INQUIRY_ACTION_LABELS[confirmAction]
                : "Confirm action"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "confirm"
                ? "This confirms the saved products and quantities as firm demand. You can then sell from stock or plan production."
                : confirmAction === "close"
                  ? "Close this inquiry when no more follow-up is needed. Linked sales and production orders retain their own status."
                  : "Cancel this inquiry and stop further processing. Linked documents retain their own status and must be handled separately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Go back</AlertDialogCancel>
            <Button
              type="button"
              variant={confirmAction === "cancel" ? "destructive" : "default"}
              disabled={busy}
              onClick={() => confirmAction && void run(confirmAction)}
            >
              {busy
                ? "Working…"
                : confirmAction
                  ? INQUIRY_ACTION_LABELS[confirmAction]
                  : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {produce && (
        <InquiryProductionDialog
          inquiry={inquiry}
          onClose={() => setProduce(false)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}

function InquiryProductionDialog({
  inquiry,
  onClose,
  onChanged,
}: {
  inquiry: Inquiry;
  onClose: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const products =
    inquiry.lines?.filter((l) => l.item?.itemType === "FINISHED") ?? [];
  const [itemId, setItemId] = useState(products[0]?.itemId ?? "");
  const [locationId, setLocationId] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    data: locations,
    loading,
    error,
  } = useFetch(() => fetchAllLocations(), []);
  const selectedLocation = locationId || locations?.[0]?.id || "";
  async function create() {
    if (!itemId || !selectedLocation) return;
    setBusy(true);
    try {
      const order = await api<ProductionOrder>(
        "/production-orders/from-inquiry",
        {
          method: "POST",
          body: {
            inquiryId: inquiry.id,
            itemId,
            inquiryLineId: products.find((l) => l.itemId === itemId)?.id,
            locationId: selectedLocation,
            finishedLocationId: selectedLocation,
          },
        },
      );
      requestNotificationsRefresh();
      onChanged();
      onClose();
      toast.success("Draft production order created");
      router.push(`/production-orders/${order.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start production</DialogTitle>
          <DialogDescription>
            Create one draft work order for the selected product using its saved
            quantity and conversion. Production is optional when stock is
            available.
          </DialogDescription>
        </DialogHeader>
        <FormGrid cols={1}>
          <FormField
            label="Product to produce"
            htmlFor={`production-item-${inquiry.id}`}
          >
            <select
              id={`production-item-${inquiry.id}`}
              className="app-control h-11 w-full rounded-md border bg-background px-3"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              disabled={busy}
            >
              {products.map((l) => (
                <option key={l.itemId} value={l.itemId}>
                  {l.item?.description ?? "Product"}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Production location"
            htmlFor={`production-location-${inquiry.id}`}
          >
            <select
              id={`production-location-${inquiry.id}`}
              className="app-control h-11 w-full rounded-md border bg-background px-3"
              value={selectedLocation}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={busy || loading}
            >
              <option value="">
                {loading ? "Loading locations…" : "Select a location"}
              </option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </FormGrid>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Go back
          </Button>
          <Button
            disabled={busy || !itemId || !selectedLocation}
            onClick={() => void create()}
          >
            {busy ? "Creating…" : "Create production order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
