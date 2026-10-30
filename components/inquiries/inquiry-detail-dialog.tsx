"use client";

import { RecordActivity } from "@/components/shared/record-metadata";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  InquiryStatusBadge,
} from "@/components/inquiries/inquiry-status-badge";
import { PageLoading } from "@/components/shared/page-loading";
import { useInquiryFormOptions } from "@/hooks/use-inquiry-form-options";
import { useLocations } from "@/hooks/use-locations";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  buildUpdateInquiryBody,
  uploadInquiryFiles,
  inquiryToFormValues,
  inquiryFormFingerprint,
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
  const [produceItemId, setProduceItemId] = useState("");
  const [producing, setProducing] = useState(false);

  const {
    customers,
    customerOptions,
    userOptions,
    itemOptions,
    itemsLoading,
    reloadCustomers,
    setCustomers,
  } = useInquiryFormOptions();
  const { data: locations } = useLocations();

  const hasUnsavedChanges = !!(
    values &&
    inquiry &&
    inquiryFormFingerprint(values) !==
      inquiryFormFingerprint(inquiryToFormValues(inquiry))
  );
  const canWrite = hasPermission(user, "inquiries.write");
  const canProduce = hasPermission(user, "production.write");
  const canSell = hasPermission(user, "sales.write");
  const isAssignee = Boolean(user?.id && inquiry?.assignedToUserId === user.id);
  const canAcceptDecline =
    canWrite && isAssignee && inquiry?.assignmentStatus === "PENDING";
  const canClaim =
    canWrite &&
    inquiry != null &&
    inquiry.status !== "CANCELLED" &&
    inquiry.status !== "CONVERTED" &&
    inquiry.status !== "CLOSED" &&
    (inquiry.assignmentStatus === "UNASSIGNED" ||
      inquiry.assignmentStatus === "DECLINED" ||
      !inquiry.assignmentStatus);

  const canConfirmQuote =
    canWrite &&
    inquiry != null &&
    (inquiry.status === "NEW" || inquiry.status === "IN_PROGRESS") &&
    inquiry.assignmentStatus !== "PENDING" &&
    inquiry.assignmentStatus !== "DECLINED";

  const firmDemand =
    inquiry != null &&
    inquiry.assignmentStatus !== "PENDING" &&
    inquiry.assignmentStatus !== "DECLINED" &&
    inquiry.status !== "CANCELLED" &&
    inquiry.status !== "CLOSED" &&
    inquiry.status !== "CONVERTED";

  /**
   * Firm demand (QUOTED): plan a work order.
   * Re-confirm quote after a job moves the inquiry to IN_PROGRESS.
   */
  const canStartProduction =
    canProduce && firmDemand && inquiry?.status === "QUOTED";

  /**
   * Sell from stock on firm demand, or after production marks ready for sale.
   * Production is optional when FG is already available.
   */
  const canCreateSale =
    canSell &&
    firmDemand &&
    (inquiry?.status === "QUOTED" ||
      inquiry?.status === "IN_PROGRESS" ||
      Boolean(inquiry?.readyForSaleAt));

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
        body: buildUpdateInquiryBody(values, inquiry),
      });
      await uploadInquiryFiles(inquiryId, values.files);
      const saved = values.files.length
        ? await api<Inquiry>(`/inquiries/${inquiryId}`)
        : updated;
      setInquiry(saved);
      setValues(inquiryToFormValues(saved));
      toast.success("Inquiry updated");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignmentAction(
    action: "accept" | "decline" | "claim",
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
            : "Inquiry claimed",
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
        "Converted inquiries cannot be cancelled — close them instead",
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

  async function handleConfirmQuote() {
    if (!inquiryId) return;
    setActing(true);
    try {
      const updated = await api<Inquiry>(`/inquiries/${inquiryId}/confirm`, {
        method: "POST",
      });
      setInquiry(updated);
      setValues(inquiryToFormValues(updated));
      toast.success("Quote confirmed — firm demand for production");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActing(false);
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
            itemId: produceItemId || undefined,
            inquiryLineId: inquiry?.lines?.find(
              (l) => l.itemId === produceItemId,
            )?.id,
            locationId: produceLocationId,
            finishedLocationId: produceLocationId,
          },
        },
      );
      toast.success("Draft production order created");
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
                {inquiry.readyForSaleAt ? (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Ready for sale
                  </span>
                ) : null}
                <span className="text-xs text-[var(--frappe-text-muted)]">
                  Created by {inquiry.createdBy?.fullName ?? "Not recorded"} ·{" "}
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
            <form
              onSubmit={handleSave}
              className="flex min-h-0 flex-1 flex-col"
            >
              <InquiryFormDialogBody>
                {inquiry && <RecordActivity record={inquiry} />}
                {inquiry?.assignmentStatus === "PENDING" && isAssignee ? (
                  <div className="mb-4 rounded-md border border-[var(--frappe-border)] bg-[var(--frappe-bg)] px-3 py-2.5 text-sm text-[var(--frappe-text)]">
                    This inquiry was assigned to you. Accept to take ownership,
                    or decline to return it to the pool.
                  </div>
                ) : null}
                {hasUnsavedChanges && (
                  <p
                    role="status"
                    className="mb-4 rounded-lg border bg-primary/5 p-3 text-sm"
                  >
                    Save your changes before confirming, creating a sale or
                    starting production.
                  </p>
                )}
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
                <fieldset disabled={!canWrite} className="min-w-0">
                  <InquiryFormFields
                    mode="edit"
                    idPrefix="inquiry-edit"
                    values={values}
                    onChange={(patch) =>
                      setValues((prev) => (prev ? { ...prev, ...patch } : prev))
                    }
                    customers={customers}
                    customerOptions={customerOptions}
                    userOptions={userOptions}
                    itemOptions={[
                      ...itemOptions,
                      ...(inquiry?.lines ?? [])
                        .filter(
                          (l) =>
                            l.item &&
                            !itemOptions.some((o) => o.itemId === l.itemId),
                        )
                        .map((l) => ({
                          itemId: l.itemId,
                          item: l.item!,
                          label: l.item!.description,
                          itemType: l.item!.itemType,
                        })),
                    ]}
                    itemsLoading={itemsLoading}
                    onCustomerCreated={(customer) => {
                      setCustomers((prev) => [...(prev ?? []), customer]);
                      setValues((prev) =>
                        prev ? { ...prev, customerId: customer.id } : prev,
                      );
                      reloadCustomers();
                    }}
                  />
                </fieldset>
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
                {canConfirmQuote ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting || hasUnsavedChanges}
                    onClick={() => void handleConfirmQuote()}
                  >
                    Confirm quote
                  </Button>
                ) : null}
                {canCreateSale && inquiryId ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={hasUnsavedChanges}
                    onClick={() => {
                      onOpenChange(false);
                      router.push(
                        `/sales/new?inquiryId=${encodeURIComponent(inquiryId)}`,
                      );
                    }}
                  >
                    {inquiry?.readyForSaleAt
                      ? "Create sale"
                      : "Sell from stock"}
                  </Button>
                ) : null}
                {canStartProduction ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting || hasUnsavedChanges}
                    onClick={() => {
                      setProduceLocationId(locations?.[0]?.id ?? "");
                      setProduceItemId(inquiry?.lines?.[0]?.itemId ?? "");
                      setProduceOpen(true);
                    }}
                  >
                    Start production
                  </Button>
                ) : null}
                {canClaim && inquiry?.assignmentStatus !== "PENDING" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting || hasUnsavedChanges}
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
                      disabled={acting || hasUnsavedChanges}
                      onClick={() => void handleAssignmentAction("decline")}
                    >
                      Decline
                    </Button>
                    <Button
                      type="button"
                      disabled={acting || hasUnsavedChanges}
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
                  <FrappeButtonPrimary
                    type="submit"
                    disabled={saving || acting}
                  >
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
            <DialogDescription>
              Use when stock is short or the item must be made. Creates a draft
              work order from the default BOM. If finished goods are already on
              hand, prefer Sell from stock instead.
            </DialogDescription>
          </DialogHeader>
          <div className="app-canvas grid gap-4 px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-2">
              <Label htmlFor="mto-produce-item">Product to produce</Label>
              <Select value={produceItemId} onValueChange={setProduceItemId}>
                <SelectTrigger id="mto-produce-item">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {inquiry?.lines?.map((l) => (
                    <SelectItem key={l.itemId} value={l.itemId}>
                      {l.item?.description ?? "Product"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Creates one draft work order for the selected product. Repeat
                for additional products.
              </p>
            </div>

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
