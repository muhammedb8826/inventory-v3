"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FrappeButtonPrimary } from "@/components/frappe";
import { InquiryFormFields } from "@/components/inquiries/inquiry-form-fields";
import {
  InquiryFormDialogBody,
  InquiryFormDialogContent,
  InquiryFormDialogFooter,
  InquiryFormDialogHeader,
} from "@/components/inquiries/inquiry-form-dialog-shell";
import { useInquiryFormOptions } from "@/hooks/use-inquiry-form-options";
import { api } from "@/lib/api";
import {
  buildCreateInquiryBody,
  EMPTY_INQUIRY_FORM,
  validateInquiryContact,
  type InquiryFormValues,
} from "@/lib/inquiries";
import { errorMessage } from "@/lib/format";
import type { Inquiry } from "@/lib/types";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

export function InquiryCreateDialog({
  onSuccess,
}: {
  onSuccess: (inquiry?: Inquiry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<InquiryFormValues>(EMPTY_INQUIRY_FORM);
  const [saving, setSaving] = useState(false);

  const {
    customerOptions,
    userOptions,
    itemOptions,
    reloadCustomers,
    setCustomers,
  } = useInquiryFormOptions();

  function reset() {
    setValues(EMPTY_INQUIRY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const contactError = validateInquiryContact(values);
    if (contactError) {
      toast.error(contactError);
      return;
    }

    setSaving(true);
    try {
      const created = await api<Inquiry>("/inquiries", {
        method: "POST",
        body: buildCreateInquiryBody(values),
      });
      toast.success("Inquiry created");
      setOpen(false);
      reset();
      onSuccess(created);
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
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <FrappeButtonPrimary type="button">
          <PlusIcon className="size-3.5" />
          New inquiry
        </FrappeButtonPrimary>
      </DialogTrigger>
      <InquiryFormDialogContent>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <InquiryFormDialogHeader title="New inquiry" />
          <InquiryFormDialogBody>
            <InquiryFormFields
              mode="create"
              idPrefix="inquiry-new"
              values={values}
              onChange={(patch) =>
                setValues((prev) => ({ ...prev, ...patch }))
              }
              customerOptions={customerOptions}
              userOptions={userOptions}
              itemOptions={itemOptions}
              onCustomerCreated={(customer) => {
                setCustomers((prev) => [...(prev ?? []), customer]);
                setValues((prev) => ({ ...prev, customerId: customer.id }));
                reloadCustomers();
              }}
            />
          </InquiryFormDialogBody>
          <InquiryFormDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <FrappeButtonPrimary type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </FrappeButtonPrimary>
          </InquiryFormDialogFooter>
        </form>
      </InquiryFormDialogContent>
    </Dialog>
  );
}
