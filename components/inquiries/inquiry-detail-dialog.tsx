"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";
import { useInquiryFormOptions } from "@/hooks/use-inquiry-form-options";
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
import type { Inquiry } from "@/lib/types";
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
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [values, setValues] = useState<InquiryFormValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [acting, setActing] = useState(false);

  const {
    customerOptions,
    userOptions,
    itemOptions,
    reloadCustomers,
    setCustomers,
  } = useInquiryFormOptions();

  const canWrite = hasPermission(user, "inquiries.write");
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

  useEffect(() => {
    if (!open || !inquiryId) {
      setInquiry(null);
      setValues(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <InquiryFormDialogContent>
        <InquiryFormDialogHeader title="Inquiry">
          {inquiry ? (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <InquiryStatusBadge status={inquiry.status} />
              <InquiryAssignmentBadge status={inquiry.assignmentStatus} />
              <InquiryPriorityBadge priority={inquiry.priority} />
              <InquirySourceBadge source={inquiry.source} />
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
                onCustomerCreated={(customer) => {
                  setCustomers((prev) => [...(prev ?? []), customer]);
                  setValues((prev) =>
                    prev ? { ...prev, customerId: customer.id } : prev
                  );
                  reloadCustomers();
                }}
              />
            </InquiryFormDialogBody>

            <PermissionGate permission="inquiries.write">
              <InquiryFormDialogFooter>
                {inquiry &&
                inquiry.status !== "CANCELLED" &&
                inquiry.status !== "CONVERTED" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="mr-auto h-8 text-xs"
                    disabled={cancelling || acting}
                    onClick={() => void handleCancel()}
                  >
                    {cancelling ? "Cancelling…" : "Cancel inquiry"}
                  </Button>
                ) : null}
                {canClaim && inquiry?.assignmentStatus !== "PENDING" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-xs"
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
                      className="h-8 text-xs"
                      disabled={acting}
                      onClick={() => void handleAssignmentAction("decline")}
                    >
                      Decline
                    </Button>
                    <Button
                      type="button"
                      className="h-8 text-xs"
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
                  className="h-8 text-xs"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <FrappeButtonPrimary type="submit" disabled={saving || acting}>
                  {saving ? "Saving…" : "Save"}
                </FrappeButtonPrimary>
              </InquiryFormDialogFooter>
            </PermissionGate>
          </form>
        )}
      </InquiryFormDialogContent>
    </Dialog>
  );
}
