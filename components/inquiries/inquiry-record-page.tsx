"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  PackageIcon,
  PencilIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/shared/page-loading";
import { AccessDenied } from "@/components/shared/access-denied";
import {
  RecordActivity,
  timestampText,
} from "@/components/shared/record-metadata";
import { PageForm, PageFormActions } from "@/components/shared/page-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { InquiryActions } from "./inquiry-actions";
import {
  InquiryAssignmentBadge,
  InquiryPriorityBadge,
  InquiryStatusBadge,
} from "./inquiry-status-badge";
import { InquiryFormFields } from "./inquiry-form-fields";
import { UnitQuantityDisplay } from "@/components/inventory/unit-quantity-display";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { useFetch } from "@/hooks/use-fetch";
import { useInquiryFormOptions } from "@/hooks/use-inquiry-form-options";
import {
  buildUpdateInquiryBody,
  inquiryFormFingerprint,
  inquiryToFormValues,
  uploadInquiryFiles,
  validateInquiryContact,
} from "@/lib/inquiries";
import { inquiryReference, inquiryWorkflow } from "@/lib/inquiry-workflow";
import { errorMessage } from "@/lib/format";
import { resolveItemImageUrl } from "@/lib/inventory-media";
import { cn } from "@/lib/utils";
import type { Inquiry } from "@/lib/types";
import { toast } from "sonner";

export function InquiryRecordPage({ mode }: { mode: "view" | "edit" }) {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const canRead = hasPermission(user, "inquiries.read");
  const {
    data: fetched,
    error,
    reload,
  } = useFetch(
    () => api<Inquiry>(`/inquiries/${encodeURIComponent(id)}`),
    [id],
    {
      enabled:
        canRead && (mode === "view" || hasPermission(user, "inquiries.write")),
    },
  );
  const inquiry = fetched?.id === id ? fetched : null;
  const editing = mode === "edit";
  const denied =
    !canRead || (editing && !hasPermission(user, "inquiries.write"));
  useEffect(() => {
    document
      .getElementById("workspace-content")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }, [id, mode]);
  const workflow = inquiry && inquiryWorkflow(inquiry, user);
  return (
    <AppShell
      title={editing ? "Edit inquiry" : (inquiry?.subject ?? "Inquiry details")}
      subtitle={
        inquiry
          ? `${inquiryReference(inquiry)} · Customer requirements and follow-up`
          : undefined
      }
      variant={editing ? "form" : "plain"}
      breadcrumbs={[
        { label: "Inquiries", href: "/inquiries" },
        ...(editing
          ? [
              {
                label: inquiry ? inquiryReference(inquiry) : "Details",
                href: `/inquiries/${id}`,
              },
              { label: "Edit" },
            ]
          : [{ label: inquiry ? inquiryReference(inquiry) : "Details" }]),
      ]}
    >
      {authLoading || (!denied && !inquiry && !error) ? (
        <PageLoading />
      ) : denied ? (
        <AccessDenied />
      ) : error || !inquiry ? (
        <div role="alert" className="rounded-xl border bg-card p-6">
          <p>{error ?? "Inquiry not found."}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inquiries">Back to inquiries</Link>
            </Button>
            <Button onClick={() => void reload()}>Try again</Button>
          </div>
        </div>
      ) : editing ? (
        workflow?.canEdit ? (
          <InquiryEditor key={inquiry.id} inquiry={inquiry} />
        ) : (
          <div className="rounded-xl border bg-card p-6">
            <p>
              This inquiry is {inquiry.status.toLowerCase()} and cannot be
              edited.
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/inquiries/${inquiry.id}`}>View details</Link>
            </Button>
          </div>
        )
      ) : (
        <InquiryDetails inquiry={inquiry} reload={reload} />
      )}
    </AppShell>
  );
}

function InquiryProgress({ inquiry }: { inquiry: Inquiry }) {
  const { user } = useAuth();
  const workflow = inquiryWorkflow(inquiry, user);
  const labels = [
    "Created",
    "In review",
    "Confirmed",
    "Converted to sale",
    "Closed",
  ];
  const reached = [
    true,
    !!inquiry.acceptedAt ||
      inquiry.status === "IN_PROGRESS" ||
      workflow.confirmed ||
      workflow.converted,
    workflow.confirmed || workflow.converted,
    workflow.converted,
    inquiry.status === "CLOSED",
  ];
  return (
    <section
      aria-label="Inquiry progress"
      className="rounded-2xl border bg-card p-4 sm:p-6"
    >
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {labels.map((label, i) => (
          <li
            key={label}
            aria-current={
              inquiry.status !== "CANCELLED" && workflow.step === i
                ? "step"
                : undefined
            }
            className={cn(
              "flex items-center gap-2 rounded-xl border p-3 text-xs font-medium",
              reached[i]
                ? "border-primary/20 bg-primary/5 text-primary"
                : "border-transparent bg-muted/30 text-muted-foreground",
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-card">
              {reached[i] &&
              (inquiry.status === "CANCELLED" || i !== workflow.step) ? (
                <CheckIcon className="size-3.5" />
              ) : (
                i + 1
              )}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted-foreground" role="status">
        {workflow.hint}
      </p>
      {!!workflow.production.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          Production is a separate fulfillment path. See linked production
          orders below.
        </p>
      )}
    </section>
  );
}

function InquiryDetails({
  inquiry,
  reload,
}: {
  inquiry: Inquiry;
  reload: () => Promise<void>;
}) {
  const { user } = useAuth();
  const workflow = inquiryWorkflow(inquiry, user);
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/inquiries"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeftIcon className="size-4" />
            Inquiries
          </Link>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {inquiryReference(inquiry)}
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">
            {inquiry.subject}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <InquiryStatusBadge status={inquiry.status} />
            <InquiryAssignmentBadge status={inquiry.assignmentStatus} />
            <InquiryPriorityBadge priority={inquiry.priority} />
            {inquiry.readyForSaleAt && (
              <Badge variant="secondary">Ready for sale</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {workflow.canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/inquiries/${inquiry.id}/edit`}>
                <PencilIcon className="size-4" />
                Edit
              </Link>
            </Button>
          )}
          <InquiryActions inquiry={inquiry} onChanged={() => void reload()} />
        </div>
      </div>
      <InquiryProgress inquiry={inquiry} />
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <h2 className="mb-4 text-base font-semibold">
              Products requested{" "}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({inquiry.lines?.length ?? 0})
              </span>
            </h2>
            {!inquiry.lines?.length ? (
              <p className="text-sm text-muted-foreground">
                General inquiry. See the requirements below.
              </p>
            ) : (
              <ul className="divide-y">
                {inquiry.lines.map((line) => {
                  const image = resolveItemImageUrl(line.item?.imageUrl);
                  return (
                    <li
                      key={line.id ?? line.itemId}
                      className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)]"
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/20">
                          {image ? (
                            <Image
                              src={image}
                              width={56}
                              height={56}
                              unoptimized
                              alt={line.item?.description ?? "Product"}
                              className="size-full object-contain p-1"
                            />
                          ) : (
                            <PackageIcon className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">
                            {line.item?.description ?? "Product"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            SKU: {line.item?.sku ?? "Not set"}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Requested quantity
                        </p>
                        {line.quantity == null ? (
                          <span>Not specified</span>
                        ) : (
                          <UnitQuantityDisplay
                            quantity={line.quantity}
                            unit={
                              line.item?.stockUnit?.symbol ?? line.item?.unit
                            }
                            snapshot={line.unitSnapshot}
                            commercial
                          />
                        )}
                      </div>
                      <div className="text-sm">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Product notes
                        </p>
                        <p className="whitespace-pre-wrap break-words">
                          {line.notes || "No additional notes"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <h2 className="text-base font-semibold">
              Requirements and reference files
            </h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {inquiry.message || "No additional requirements."}
            </p>
            {!!inquiry.attachments?.length && (
              <ul className="mt-4 grid gap-2">
                {inquiry.attachments.map((f) => (
                  <li key={f.id}>
                    <a
                      className="flex items-center gap-3 rounded-lg border p-3 text-sm text-primary hover:bg-primary/5"
                      href={`/api/backend/inquiries/${inquiry.id}/attachments/${f.id}`}
                      download={f.name}
                    >
                      <DownloadIcon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 break-all">{f.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {(!!inquiry.productionOrders?.length ||
            !!inquiry.convertedSaleId) && (
            <section className="rounded-2xl border bg-card p-4 sm:p-6">
              <h2 className="mb-3 text-base font-semibold">Linked documents</h2>
              <ul className="grid gap-3">
                {inquiry.convertedSaleId && (
                  <li className="rounded-lg border p-3 text-sm">
                    {hasPermission(user, "sales.read") ? (
                      <Link
                        href={`/sales/${inquiry.convertedSaleId}`}
                        className="text-primary underline"
                      >
                        Open linked sale
                      </Link>
                    ) : (
                      "Converted to a sale"
                    )}
                  </li>
                )}
                {inquiry.productionOrders?.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    {hasPermission(user, "production.read") ? (
                      <Link
                        className="text-primary underline"
                        href={`/production-orders/${p.id}`}
                      >
                        {p.orderNumber ?? `Production ${p.id.slice(0, 8)}`}
                      </Link>
                    ) : (
                      <span>{p.orderNumber ?? "Production order"}</span>
                    )}
                    <Badge variant="outline">
                      {p.status.replaceAll("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {inquiry.internalNotes && (
            <section className="rounded-2xl border bg-card p-4 sm:p-6">
              <h2 className="text-base font-semibold">Internal notes</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {inquiry.internalNotes}
              </p>
            </section>
          )}
          <RecordActivity record={inquiry} />
        </div>
        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 font-semibold">Inquiry information</h2>
            <dl className="grid gap-4 text-sm">
              {[
                ["Customer", inquiry.customer?.name ?? "Internal request"],
                [
                  "Requested delivery",
                  inquiry.requestedDeliveryDate ?? "Not specified",
                ],
                ["Assigned to", inquiry.assignedTo?.fullName ?? "Unassigned"],
                [
                  "Follow-up",
                  inquiry.followUpAt
                    ? timestampText(inquiry.followUpAt)
                    : "Not scheduled",
                ],
                ["Created by", inquiry.createdBy?.fullName ?? "Not recorded"],
                ["Created at", timestampText(inquiry.createdAt)],
                ["Updated by", inquiry.updatedBy?.fullName ?? "Not recorded"],
                ["Updated at", timestampText(inquiry.updatedAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InquiryEditor({ inquiry }: { inquiry: Inquiry }) {
  const router = useRouter();
  const options = useInquiryFormOptions();
  const [values, setValues] = useState(() => inquiryToFormValues(inquiry));
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const dirty =
    inquiryFormFingerprint(values) !==
    inquiryFormFingerprint(inquiryToFormValues(inquiry));
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const error = validateInquiryContact(values);
    if (error) return void toast.error(error);
    setSaving(true);
    try {
      await api(`/inquiries/${inquiry.id}`, {
        method: "PATCH",
        body: buildUpdateInquiryBody(values, inquiry),
      });
      await uploadInquiryFiles(inquiry.id, values.files);
      toast.success("Inquiry updated");
      router.push(`/inquiries/${inquiry.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <p className="mx-auto mb-4 max-w-7xl text-sm text-muted-foreground">
        Update the request here. Workflow actions are available on the details
        page after saving.
      </p>
      <PageForm onSubmit={save} maxWidth="max-w-7xl">
        <fieldset disabled={saving} className="min-w-0">
          <InquiryFormFields
            mode="edit"
            idPrefix="inquiry-edit"
            values={values}
            onChange={(patch) => setValues((old) => ({ ...old, ...patch }))}
            {...options}
            itemOptions={[
              ...options.itemOptions,
              ...(inquiry.lines ?? [])
                .filter(
                  (l) =>
                    l.item &&
                    !options.itemOptions.some((o) => o.itemId === l.itemId),
                )
                .map((l) => ({
                  itemId: l.itemId,
                  item: l.item!,
                  label: l.item!.description,
                  itemType: l.item!.itemType,
                })),
            ]}
            onCustomerCreated={(customer) => {
              options.setCustomers((old) => [...(old ?? []), customer]);
              setValues((old) => ({ ...old, customerId: customer.id }));
            }}
          />
        </fieldset>
        <PageFormActions>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() =>
              dirty ? setDiscard(true) : router.push(`/inquiries/${inquiry.id}`)
            }
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </PageFormActions>
      </PageForm>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved form changes will be lost. Files already removed from
              this inquiry remain removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => router.push(`/inquiries/${inquiry.id}`)}
            >
              Discard changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
