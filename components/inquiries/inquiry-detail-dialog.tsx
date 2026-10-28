"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FrappeButtonPrimary } from "@/components/frappe";
import { InquiryFormFields } from "@/components/inquiries/inquiry-form-fields";
import {
  InquiryFormDialogBody,
  InquiryFormDialogContent,
  InquiryFormDialogFooter,
  InquiryFormDialogHeader,
} from "@/components/inquiries/inquiry-form-dialog-shell";
import {
  InquiryAssignmentBadge,
  InquiryPriorityBadge,
  InquirySourceBadge,
  InquiryStatusBadge,
} from "@/components/inquiries/inquiry-status-badge";
import { PageLoading } from "@/components/shared/page-loading";
import { useInquiryFormOptions } from "@/hooks/use-inquiry-form-options";
import { useLocations } from "@/hooks/use-locations";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  buildUpdateInquiryBody,
  inquiryToFormValues,
  validateInquiryContact,
  type InquiryFormValues,
} from "@/lib/inquiries";
import { hasPermission } from "@/lib/permissions";
import { errorMessage, formatDate } from "@/lib/format";
import type { Inquiry, ProductionOrder } from "@/lib/types";
import { toast } from "sonner";

export function InquiryDetailDialog({
  inquiryId,
  open,
  onOpenChange,
  onChanged,
}: {
  inquiryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [values, setValues] = useState<InquiryFormValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [acting, setActing] = useState(false);
  const [produceOpen, setProduceOpen] = useState(false);
  const [produceLocationId, setProduceLocationId] = useState("");
  const [producing, setProducing] = useState(false);

  const {
    customerOptions,
    userOptions,
    itemOptions,
    itemsLoading,
    reloadCustomers,
    setCustomers,
  } = useInquiryFormOptions();
  const { data: locations } = useLocations();

  const canWrite = hasPermission(user, "inquiries.write");
  const canProduce = hasPermission(user, "production.write");
  const canSell = hasPermission(user, "sales.write");
  const isAssignee = Boolean(
    user?.id && inquiry?.assignedToUserId === user.id
  );
  const canAcceptDecline =
    canWrite &&
    isAssignee &&
    inquiry?.assignmentStatus === "PENDING";
  const canClaim =
    canWrite &&
    inquiry != null &&
    inquiry.status !== "CANCELLED" &&
    inquiry.status !== "CONVERTED" &&
    inquiry.status !== "CLOSED" &&
    (inquiry.assignmentStatus === "UNASSIGNED" ||
      inquiry.assignmentStatus === "DECLINED" ||
      !inquiry.assignmentStatus);

  const canStartProduction =
    canProduce &&
    inquiry != null &&
    inquiry.status !== "CANCELLED" &&
    inquiry.status !== "CLOSED" &&
    inquiry.status !== "CONVERTED" &&
    inquiry.assignmentStatus !== "PENDING" &&
    inquiry.assignmentStatus !== "DECLINED";

  const canCreateSale =
    canSell &&
    inquiry != null &&
    inquiry.status !== "CANCELLED" &&
    inquiry.status !== "CLOSED" &&
    inquiry.status !== "CONVERTED" &&
    Boolean(inquiry.readyForSaleAt);

  useEffect(() => {
    if (!open || !inquiryId) {
      setInquiry(null);
      setValues(null);
      setProduceOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    api<Inquiry>(`/inquiries/${inquiryId}`)
      .then((row) => {
        if (cancelled) return;
        setInquiry(row);
        setValues(inquiryToFormValues(row));
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, inquiryId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiryId || !values) return;

    const contactError = validateInquiryContact(values);
    if (contactError) {
      toast.error(contactError);
      return;
    }

    setSaving(true);
    try {
      const updated = await api<Inquiry>(`/inquiries/${inquiryId}`, {
        method: "PATCH",
        body: buildUpdateInquiryBody(values),
      });
      setInquiry(updated);
      setValues(inquiryToFormValues(updated));
      toast.success("Inquiry updated");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignmentAction(
    action: "accept" | "decline" | "claim"
  ) {
    if (!inquiryId) return;
    setActing(true);
    try {
      const updated = await api<Inquiry>(`/inquiries/${inquiryId}/${action}`, {
        method: "POST",
      });
      setInquiry(updated);
      setValues(inquiryToFormValues(updated));
      toast.success(
        action === "accept"
          ? "Inquiry accepted"
          : action === "decline"
            ? "Inquiry declined"
            : "Inquiry claimed"
      );
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    if (!inquiryId || !inquiry) return;
    if (inquiry.status === "CONVERTED") {
      toast.error(
        "Converted inquiries cannot be cancelled — close them instead"
      );
      return;
    }
    if (!confirm("Cancel this inquiry?")) return;

    setCancelling(true);
    try {
      await api(`/inquiries/${inquiryId}`, { method: "DELETE" });
      toast.success("Inquiry cancelled");
      onOpenChange(false);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  async function handleStartProduction() {
    if (!inquiryId || !produceLocationId) {
      toast.error("Select a location");
      return;
    }
    setProducing(true);
    try {
      const order = await api<ProductionOrder>(
        "/production-orders/from-inquiry",
        {
          method: "POST",
          body: {
            inquiryId,
            locationId: produceLocationId,
            finishedLocationId: produceLocationId,
          },
        },
      );
      toast.success("Production order created");
      setProduceOpen(false);
      onOpenChange(false);
      onChanged();
      router.push(`/production-orders/${order.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProducing(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <InquiryFormDialogContent>
          <InquiryFormDialogHeader title="Inquiry">
            {inquiry ? (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <InquiryStatusBadge status={inquiry.status} />
                <InquiryAssignmentBadge status={inquiry.assignmentStatus} />
                <InquiryPriorityBadge priority={inquiry.priority} />
                <InquirySourceBadge source={inquiry.source} />
                {inquiry.readyForSaleAt ? (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Ready for sale
                  </span>
                ) : null}
                <span className="text-xs text-[var(--frappe-text-muted)]">
                  {formatDate(inquiry.createdAt)}
                </span>
              </div>
            ) : null}
          </InquiryFormDialogHeader>

          {loading || !values ? (
            <div className="p-10">
              <PageLoading />
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
              <InquiryFormDialogBody>
                {inquiry?.assignmentStatus === "PENDING" && isAssignee ? (
                  <div className="mb-4 rounded-md border border-[var(--frappe-border)] bg-[var(--frappe-bg)] px-3 py-2.5 text-sm text-[var(--frappe-text)]">
                    This inquiry was assigned to you. Accept to take ownership, or
                    decline to return it to the pool.
                  </div>
                ) : null}
                {inquiry?.convertedSaleId ? (
                  <div className="mb-4 text-sm">
                    Converted to sale{" "}
                    <Link
                      href={`/sales/${inquiry.convertedSaleId}`}
                      className="text-primary hover:underline"
                    >
                      {inquiry.convertedSaleId.slice(0, 8)}…
                    </Link>
                  </div>
                ) : null}
              <InquiryFormFields
                mode="edit"
                idPrefix="inquiry-edit"
                values={values}
                onChange={(patch) =>
                  setValues((prev) => (prev ? { ...prev, ...patch } : prev))
                }
                customerOptions={customerOptions}
                userOptions={userOptions}
                itemOptions={itemOptions}
                itemsLoading={itemsLoading}
                onCustomerCreated={(customer) => {
                  setCustomers((prev) => [...(prev ?? []), customer]);
                  setValues((prev) =>
                    prev ? { ...prev, customerId: customer.id } : prev
                  );
                  reloadCustomers();
                }}
              />
              </InquiryFormDialogBody>

              <InquiryFormDialogFooter>
                {canWrite &&
                inquiry &&
                inquiry.status !== "CANCELLED" &&
                inquiry.status !== "CONVERTED" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="sm:mr-auto"
                    disabled={cancelling || acting}
                    onClick={() => void handleCancel()}
                  >
                    {cancelling ? "Cancelling…" : "Cancel inquiry"}
                  </Button>
                ) : null}
                {canStartProduction ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting}
                    onClick={() => {
                      setProduceLocationId(locations?.[0]?.id ?? "");
                      setProduceOpen(true);
                    }}
                  >
                    Start production
                  </Button>
                ) : null}
                {canCreateSale && inquiryId ? (
                  <Button type="button" variant="outline" asChild>
                    <Link
                      href={`/sales/new?inquiryId=${encodeURIComponent(inquiryId)}`}
                      onClick={() => onOpenChange(false)}
                    >
                      Create sale
                    </Link>
                  </Button>
                ) : null}
                {canClaim && inquiry?.assignmentStatus !== "PENDING" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting}
                    onClick={() => void handleAssignmentAction("claim")}
                  >
                    {acting ? "…" : "Claim"}
                  </Button>
                ) : null}
                {canAcceptDecline ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={acting}
                      onClick={() => void handleAssignmentAction("decline")}
                    >
                      Decline
                    </Button>
                    <Button
                      type="button"
                      disabled={acting}
                      onClick={() => void handleAssignmentAction("accept")}
                    >
                      Accept
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                {canWrite ? (
                  <FrappeButtonPrimary type="submit" disabled={saving || acting}>
                    {saving ? "Saving…" : "Save"}
                  </FrappeButtonPrimary>
                ) : null}
              </InquiryFormDialogFooter>
            </form>
          )}
        </InquiryFormDialogContent>
      </Dialog>

      <Dialog open={produceOpen} onOpenChange={setProduceOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-xl p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 space-y-1 border-b border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-4 pb-3 pt-4 text-left sm:px-6 sm:pb-4 sm:pt-5">
            <DialogTitle>Start production</DialogTitle>
            <p className="text-sm text-[var(--frappe-text-muted)]">
              Creates a draft production order from this inquiry&apos;s item and
              its default BOM.
            </p>
          </DialogHeader>
          <div className="app-canvas grid gap-4 px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-2">
              <Label htmlFor="mto-produce-location">Issue / FG location</Label>
              <Select
                value={produceLocationId}
                onValueChange={setProduceLocationId}
              >
                <SelectTrigger id="mto-produce-location" className="w-full">
                  <SelectValue placeholder="Select location…" />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? []).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="app-modal-footer border-t border-[var(--frappe-border)] bg-[var(--frappe-surface)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setProduceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-w-32"
              disabled={producing || !produceLocationId}
              onClick={() => void handleStartProduction()}
            >
              {producing ? "Creating…" : "Create order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
