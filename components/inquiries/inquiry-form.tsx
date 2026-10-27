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
  const [saving, setSaving] = useState(false);

  const {
    customerOptions,
    userOptions,
    itemOptions,
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
      const created = await api<Inquiry>("/inquiries", {
        method: "POST",
        body: buildCreateInquiryBody(values),
      });
      toast.success("Inquiry created");
      router.push(`/inquiries?id=${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageForm onSubmit={handleSubmit} maxWidth="max-w-3xl">
      <InquiryFormFields
        mode="create"
        idPrefix="inquiry-new"
        values={values}
        onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
        customerOptions={customerOptions}
        userOptions={userOptions}
        itemOptions={itemOptions}
        onCustomerCreated={(customer) => {
          setCustomers((prev) => [...(prev ?? []), customer]);
          setValues((prev) => ({ ...prev, customerId: customer.id }));
          reloadCustomers();
        }}
      />
      <PageFormActions>
        <PageFormCancel href="/inquiries" />
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? <Spinner className="size-4" /> : "Save"}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
