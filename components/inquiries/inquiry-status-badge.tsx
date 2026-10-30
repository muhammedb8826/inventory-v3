import { Badge } from "@/components/ui/badge";
import { inquiryAssignmentLabel, inquiryStatusLabel } from "@/lib/inquiries";
import type {
  InquiryAssignmentStatus,
  InquiryPriority,
  InquirySource,
  InquiryStatus,
} from "@/lib/types";

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const variant =
    status === "NEW"
      ? "destructive"
      : status === "CONVERTED" || status === "CLOSED"
        ? "secondary"
        : status === "CANCELLED"
          ? "outline"
          : "default";

  return <Badge variant={variant}>{inquiryStatusLabel(status)}</Badge>;
}

export function InquiryAssignmentBadge({
  status,
}: {
  status?: InquiryAssignmentStatus | null;
}) {
  const value = status ?? "UNASSIGNED";
  const variant =
    value === "PENDING"
      ? "destructive"
      : value === "ACCEPTED"
        ? "default"
        : value === "DECLINED"
          ? "outline"
          : "secondary";

  return <Badge variant={variant}>{inquiryAssignmentLabel(value)}</Badge>;
}

export function InquiryPriorityBadge({
  priority,
}: {
  priority: InquiryPriority;
}) {
  const variant =
    priority === "URGENT" || priority === "HIGH" ? "destructive" : "outline";
  return <Badge variant={variant}>{priority}</Badge>;
}

export function InquirySourceBadge({ source }: { source: InquirySource }) {
  return (
    <Badge variant={source === "PUBLIC" ? "secondary" : "outline"}>
      {source}
    </Badge>
  );
}
