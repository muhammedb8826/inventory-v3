import type { Inquiry, User } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";

export type InquiryAction =
  | "claim"
  | "accept"
  | "decline"
  | "confirm"
  | "production"
  | "sale"
  | "sale-link"
  | "close"
  | "cancel";
export const INQUIRY_ACTION_LABELS: Record<InquiryAction, string> = {
  claim: "Claim inquiry",
  accept: "Accept assignment",
  decline: "Decline assignment",
  confirm: "Confirm requirements",
  production: "Start production",
  sale: "Create sale",
  "sale-link": "Open linked sale",
  close: "Close inquiry",
  cancel: "Cancel inquiry",
};
export function inquiryReference(row: Pick<Inquiry, "id">) {
  return `INQ-${row.id.slice(0, 8).toUpperCase()}`;
}
export function inquiryWorkflow(row: Inquiry, user: User | null | undefined) {
  const write = hasPermission(user, "inquiries.write");
  const terminal = ["CANCELLED", "CLOSED"].includes(row.status);
  const converted = !!row.convertedSaleId || row.status === "CONVERTED";
  const pending = row.assignmentStatus === "PENDING";
  const unowned =
    !row.assignmentStatus ||
    ["UNASSIGNED", "DECLINED"].includes(row.assignmentStatus);
  const production = (row.productionOrders ?? []).filter(
    (p) => p.status !== "CANCELLED",
  );
  const confirmed =
    row.status === "QUOTED" ||
    !!row.readyForSaleAt ||
    production.length > 0 ||
    !!row.hasProduction ||
    !!row.activity?.some((e) =>
      ["Quote confirmed", "Requirements confirmed"].includes(e.action),
    );
  const quantified =
    !!row.lines?.length &&
    row.lines.every((l) => l.quantity != null && Number(l.quantity) > 0);
  const actions: InquiryAction[] = [];
  if (!terminal && !converted) {
    if (write && pending && row.assignedToUserId === user?.id)
      actions.push("accept", "decline");
    if (write && unowned) actions.push("claim");
    if (!pending && row.assignmentStatus !== "DECLINED") {
      if (write && !confirmed && quantified) actions.push("confirm");
      if (confirmed && quantified && hasPermission(user, "sales.write"))
        actions.push("sale");
      if (
        confirmed &&
        quantified &&
        hasPermission(user, "production.write") &&
        row.lines?.some((l) => l.item?.itemType === "FINISHED")
      )
        actions.push("production");
    }
    if (write) actions.push("close", "cancel");
  }
  if (converted && row.convertedSaleId && hasPermission(user, "sales.read"))
    actions.push("sale-link");
  if (converted && !terminal && write) actions.push("close");
  const primary = (
    ["accept", "claim", "confirm", "sale-link", "sale"] as InquiryAction[]
  ).find((a) => actions.includes(a));
  const step =
    row.status === "CLOSED"
      ? 4
      : converted
        ? 3
        : confirmed
          ? 2
          : row.status === "IN_PROGRESS" || row.assignmentStatus === "ACCEPTED"
            ? 1
            : 0;
  const hint =
    row.status === "CANCELLED"
      ? "This inquiry was cancelled. No further workflow actions are available."
      : row.status === "CLOSED"
        ? "This inquiry is closed. Its requirements and activity remain available for reference."
        : converted
          ? "A sale has been created. Open the linked sale to continue its workflow, or close this inquiry."
          : pending
            ? "The assigned employee needs to accept this inquiry before it can progress."
            : !quantified
              ? "Add products and requested quantities on the edit page before confirming requirements."
              : row.readyForSaleAt
                ? "Production has reported finished goods ready. Check availability and create the sale."
                : confirmed
                  ? "Requirements are confirmed. Sell from available stock, or create a production order when needed."
                  : unowned
                    ? "Claim the inquiry to take responsibility, then review and confirm the requirements."
                    : "Review the customer's products, quantities and delivery requirements, then confirm them.";
  return {
    actions,
    primary,
    step,
    hint,
    production,
    confirmed,
    converted,
    canEdit: write && !terminal,
  };
}
