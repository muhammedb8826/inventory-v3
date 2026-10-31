"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageForm,
  PageFormActions,
  PageFormCancel,
} from "@/components/shared/page-form";
import { InquiryFormFields } from "@/components/inquiries/inquiry-form-fields";
import { useInquiryFormOptions } from "@/hooks/use-inquiry-form-options";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import {
  buildCreateInquiryBody,
  buildUpdateInquiryBody,
  uploadInquiryFiles,
  EMPTY_INQUIRY_FORM,
  validateInquiryContact,
  type InquiryFormValues,
} from "@/lib/inquiries";
import { errorMessage } from "@/lib/format";
import type { Inquiry } from "@/lib/types";
import { toast } from "sonner";

export function InquiryForm() {
  const router = useRouter();
  const [values, setValues] = useState<InquiryFormValues>(EMPTY_INQUIRY_FORM);
  const [createdRecord, setCreatedRecord] = useState<Inquiry | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    customers,
    customersLoading,
    customerOptions,
    userOptions,
    itemOptions,
    itemsLoading,
    reloadCustomers,
    setCustomers,
  } = useInquiryFormOptions();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const contactError = validateInquiryContact(values);
    if (contactError) {
      toast.error(contactError);
      return;
    }

    setSaving(true);
    try {
      const created = createdId
        ? await api<Inquiry>(`/inquiries/${createdId}`, {
            method: "PATCH",
            body: buildUpdateInquiryBody(values, createdRecord),
          })
        : await api<Inquiry>("/inquiries", {
            method: "POST",
            body: buildCreateInquiryBody(values),
          });
      setCreatedId(created.id);
      setCreatedRecord(created);
      await uploadInquiryFiles(created.id, values.files);
      toast.success("Inquiry created");
      router.push(`/inquiries/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageForm onSubmit={handleSubmit} maxWidth="max-w-7xl">
      {createdId && (
        <p role="status" className="rounded-lg border bg-primary/5 p-3 text-sm">
          Inquiry saved. Retry saving to finish the attachment upload; this will
          update the same inquiry.
        </p>
      )}
      <InquiryFormFields
        mode="create"
        idPrefix="inquiry-new"
        values={values}
        onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
        customers={customers}
        customersLoading={customersLoading}
        customerOptions={customerOptions}
        userOptions={userOptions}
        itemOptions={itemOptions}
        itemsLoading={itemsLoading}
        onCustomerCreated={(customer) => {
          setCustomers((prev) => [...(prev ?? []), customer]);
          setValues((prev) => ({ ...prev, customerId: customer.id }));
          reloadCustomers();
        }}
      />
      <PageFormActions>
        <PageFormCancel href="/inquiries" />
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? (
            <Spinner className="size-4" />
          ) : createdId ? (
            "Retry save"
          ) : (
            "Save inquiry"
          )}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
