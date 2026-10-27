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
  itemId: string;
  quantity: string;
  notes: string;
}

export interface InquiryFormValues {
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
  status?: InquiryAssignmentStatus | null
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
      quantity:
        line.quantity != null && String(line.quantity).trim() !== ""
          ? String(Number(line.quantity))
          : "1",
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

export function validateInquiryContact(values: InquiryFormValues): string | null {
  if (!values.phone.trim() && !values.email.trim()) {
    return "Provide at least a phone number or email";
  }
  return null;
}

export function buildInquiryLinePayload(
  lines: InquiryFormLine[]
): InquiryLineInput[] | undefined {
  const parsed: InquiryLineInput[] = [];
  for (const line of lines) {
    const itemId = line.itemId.trim();
    if (!itemId) continue;
    const qty = parseFloat(line.quantity);
    const payload: InquiryLineInput = { itemId };
    if (!Number.isNaN(qty) && qty > 0) payload.quantity = qty;
    const notes = optionalString(line.notes);
    if (notes) payload.notes = notes;
    parsed.push(payload);
  }
  return parsed.length > 0 ? parsed : undefined;
}

export function buildCreateInquiryBody(
  values: InquiryFormValues
): CreateInquiryBody {
  const body: CreateInquiryBody = {
    contactName: values.contactName.trim(),
    subject: values.subject.trim(),
    message: values.message.trim(),
    phone: optionalString(values.phone),
    email: optionalString(values.email),
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
  values: InquiryFormValues
): UpdateInquiryBody {
  return {
    contactName: values.contactName.trim(),
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
    subject: values.subject.trim(),
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
    convertedSaleId: emptyToNull(values.convertedSaleId),
  };
}

export function inquiryItemsSummary(inquiry: Inquiry): string {
  const lines: InquiryLine[] = inquiry.lines ?? [];
  if (lines.length > 0) {
    return lines
      .map((line) => {
        const name = line.item?.description ?? line.item?.sku ?? "Item";
        const qty =
          line.quantity != null && String(line.quantity).trim() !== ""
            ? ` × ${Number(line.quantity)}`
            : "";
        return `${name}${qty}`;
      })
      .join(", ");
  }
  if (inquiry.item?.description) return inquiry.item.description;
  return "—";
}
