import { api } from "@/lib/api";
import type {
  CreateInquiryBody,
  Inquiry,
  InquiryAssignmentStatus,
  InquiryLine,
  InquiryLineInput,
  InquiryPriority,
  InquiryStatus,
  UpdateInquiryBody,
} from "@/lib/types";

export const INQUIRY_STATUSES: InquiryStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "QUOTED",
  "CONVERTED",
  "CLOSED",
  "CANCELLED",
];

export const INQUIRY_PRIORITIES: InquiryPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export const INQUIRY_ASSIGNMENT_STATUSES: InquiryAssignmentStatus[] = [
  "UNASSIGNED",
  "PENDING",
  "ACCEPTED",
  "DECLINED",
];

export interface InquiryFormLine {
  unitId?: string;
  unitFactor?: number;
  unitSymbol?: string;
  unitPrecision?: number;
  basePrecision?: number;
  baseSymbol?: string;
  dimensions?: import("@/lib/types").AreaDimensions;
  savedFactor?: number;
  quantityUnspecified?: boolean;
  preserveSnapshot?: import("@/lib/types").UnitSnapshot;
  itemId: string;
  quantity: string;
  notes: string;
}

export interface InquiryFormValues {
  requestedDeliveryDate: string;
  files: File[];
  attachments: import("@/lib/types").InquiryAttachment[];
  inquiryId?: string;
  contactName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  priority: InquiryPriority;
  customerId: string;
  assignedToUserId: string;
  lines: InquiryFormLine[];
  internalNotes: string;
  followUpAt: string;
  status: InquiryStatus;
  convertedSaleId: string;
}

export const EMPTY_INQUIRY_LINE: InquiryFormLine = {
  itemId: "",
  quantity: "1",
  notes: "",
};

export const EMPTY_INQUIRY_FORM: InquiryFormValues = {
  requestedDeliveryDate: "",
  files: [],
  attachments: [],
  contactName: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
  priority: "NORMAL",
  customerId: "",
  assignedToUserId: "",
  lines: [{ ...EMPTY_INQUIRY_LINE }],
  internalNotes: "",
  followUpAt: "",
  status: "NEW",
  convertedSaleId: "",
};

export function inquiryStatusLabel(status: InquiryStatus): string {
  return status.replaceAll("_", " ");
}

export function inquiryAssignmentLabel(
  status?: InquiryAssignmentStatus | null,
): string {
  if (!status) return "Unassigned";
  return status.replaceAll("_", " ");
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function inquiryLinesFromRecord(inquiry: Inquiry): InquiryFormLine[] {
  const apiLines = inquiry.lines ?? [];
  if (apiLines.length > 0) {
    return apiLines.map((line) => ({
      itemId: line.itemId ?? line.item?.id ?? "",
      unitId:
        line.quantity == null
          ? ""
          : (line.unitSnapshot?.unitId ?? line.item?.unitId ?? ""),
      quantityUnspecified: line.quantity == null,
      unitFactor: Number(line.unitSnapshot?.factor ?? 1),
      savedFactor: Number(line.unitSnapshot?.factor ?? 1),
      unitSymbol:
        line.unitSnapshot?.symbol ??
        line.item?.stockUnit?.symbol ??
        line.item?.unit ??
        "",
      unitPrecision:
        line.unitSnapshot?.decimalPlaces ?? line.item?.stockUnit?.decimalPlaces,
      basePrecision: line.item?.stockUnit?.decimalPlaces,
      baseSymbol: line.item?.stockUnit?.symbol ?? line.item?.unit ?? "",
      dimensions: line.unitSnapshot?.dimensions,
      preserveSnapshot: line.unitSnapshot ?? undefined,
      quantity:
        (line.unitSnapshot?.quantity ?? line.quantity) != null &&
        String(line.unitSnapshot?.quantity ?? line.quantity).trim() !== ""
          ? String(Number(line.unitSnapshot?.quantity ?? line.quantity))
          : "",
      notes: line.notes ?? "",
    }));
  }
  if (inquiry.itemId || inquiry.item?.id) {
    return [
      {
        itemId: inquiry.itemId ?? inquiry.item?.id ?? "",
        quantity: "1",
        notes: "",
      },
    ];
  }
  return [{ ...EMPTY_INQUIRY_LINE }];
}

export function inquiryToFormValues(inquiry: Inquiry): InquiryFormValues {
  return {
    requestedDeliveryDate: inquiry.requestedDeliveryDate ?? "",
    files: [],
    attachments: inquiry.attachments ?? [],
    inquiryId: inquiry.id,
    contactName: inquiry.contactName ?? "",
    phone: inquiry.phone ?? "",
    email: inquiry.email ?? "",
    subject: inquiry.subject ?? "",
    message: inquiry.message ?? "",
    priority: inquiry.priority ?? "NORMAL",
    customerId: inquiry.customerId ?? "",
    assignedToUserId: inquiry.assignedToUserId ?? "",
    lines: inquiryLinesFromRecord(inquiry),
    internalNotes: inquiry.internalNotes ?? "",
    followUpAt: toDatetimeLocal(inquiry.followUpAt),
    status: inquiry.status,
    convertedSaleId: inquiry.convertedSaleId ?? "",
  };
}

export function validateInquiryContact(
  values: InquiryFormValues,
): string | null {
  if (!values.lines.some((line) => line.itemId) && !values.message.trim())
    return "Add a product or describe the request.";
  return null;
}

export function buildInquiryLinePayload(
  lines: InquiryFormLine[],
): InquiryLineInput[] | undefined {
  const parsed: InquiryLineInput[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const itemId = line.itemId.trim();
    if (!itemId) continue;
    if (seen.has(itemId))
      throw new Error("Choose each product once per inquiry.");
    seen.add(itemId);
    if (line.unitId === undefined)
      throw new Error("Wait for the product units to load before saving.");
    if (line.quantityUnspecified && !line.quantity.trim()) {
      parsed.push({
        itemId,
        ...(line.notes.trim() ? { notes: line.notes.trim() } : {}),
      });
      continue;
    }
    const qty = Number(line.quantity);
    if (
      !line.quantity.trim() ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      qty >= 1e11
    )
      throw new Error("Enter a positive quantity for every selected product.");
    const fits = (value: number, places: number) =>
      Math.abs(value - Number(value.toFixed(places))) < 1e-9;
    if (
      !fits(qty, line.unitPrecision ?? 3) ||
      !fits(qty * (line.unitFactor ?? 1), line.basePrecision ?? 3)
    )
      throw new Error(
        "A product quantity does not fit its selected unit or stock precision.",
      );
    parsed.push({
      itemId,
      quantity: qty,
      ...(line.unitId ? { unitId: line.unitId } : {}),
      ...(line.dimensions ? { dimensions: line.dimensions } : {}),
      ...(line.notes.trim() ? { notes: line.notes.trim() } : {}),
    });
  }
  return parsed.length > 0 ? parsed : undefined;
}

export function buildCreateInquiryBody(
  values: InquiryFormValues,
): CreateInquiryBody {
  const body: CreateInquiryBody = {
    requestedDeliveryDate: optionalString(values.requestedDeliveryDate),
    message: values.message.trim(),
    priority: values.priority,
    customerId: optionalString(values.customerId),
    assignedToUserId: optionalString(values.assignedToUserId),
    internalNotes: optionalString(values.internalNotes),
    followUpAt: optionalString(values.followUpAt)
      ? new Date(values.followUpAt).toISOString()
      : undefined,
  };
  const lines = buildInquiryLinePayload(values.lines);
  if (lines) body.lines = lines;
  return body;
}

export function buildUpdateInquiryBody(
  values: InquiryFormValues,
  original?: Inquiry | null,
): UpdateInquiryBody {
  const body: UpdateInquiryBody = {
    requestedDeliveryDate: emptyToNull(values.requestedDeliveryDate),
    message: values.message.trim(),
    status: values.status,
    priority: values.priority,
    customerId: emptyToNull(values.customerId),
    assignedToUserId: emptyToNull(values.assignedToUserId),
    lines: buildInquiryLinePayload(values.lines) ?? [],
    internalNotes: emptyToNull(values.internalNotes),
    followUpAt: values.followUpAt
      ? new Date(values.followUpAt).toISOString()
      : null,
  };
  if (
    original &&
    JSON.stringify(body.lines) ===
      JSON.stringify(
        buildInquiryLinePayload(inquiryLinesFromRecord(original)) ?? [],
      )
  )
    delete body.lines;
  return body;
}

export function inquiryItemsSummary(inquiry: Inquiry): string {
  const lines: InquiryLine[] = inquiry.lines ?? [];
  if (lines.length > 0) {
    return lines
      .map((line) => {
        const name = line.item?.description ?? line.item?.sku ?? "Item";
        const qty =
          (line.unitSnapshot?.quantity ?? line.quantity) != null &&
          String(line.unitSnapshot?.quantity ?? line.quantity).trim() !== ""
            ? ` × ${Number(line.unitSnapshot?.quantity ?? line.quantity)} ${line.unitSnapshot?.symbol ?? line.item?.unit ?? ""}`
            : "";
        return `${name}${qty}`;
      })
      .join(", ");
  }
  if (inquiry.item?.description) return inquiry.item.description;
  return "—";
}

export async function uploadInquiryFiles(id: string, files: File[]) {
  // Keep each request below the same-origin proxy's body limit. Hash deduplication makes retries safe.
  for (const file of files) {
    const data = new FormData();
    data.append("files", file);
    await api(`/inquiries/${id}/attachments`, { method: "POST", body: data });
  }
}

export function inquiryFormFingerprint(values: InquiryFormValues) {
  return JSON.stringify({
    contactName: values.contactName,
    phone: values.phone,
    email: values.email,
    subject: values.subject,
    message: values.message,
    priority: values.priority,
    customerId: values.customerId,
    assignedToUserId: values.assignedToUserId,
    internalNotes: values.internalNotes,
    followUpAt: values.followUpAt,
    requestedDeliveryDate: values.requestedDeliveryDate,
    lines: values.lines
      .filter((l) => l.itemId)
      .map((l) => ({
        itemId: l.itemId,
        quantity: l.quantity,
        unitId: l.unitId,
        dimensions: l.dimensions,
        notes: l.notes,
      })),
    files: values.files.length,
  });
}
