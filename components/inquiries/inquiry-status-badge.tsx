import { Badge } from "@/components/ui/badge";
import { inquiryAssignmentLabel, inquiryStatusLabel } from "@/lib/inquiries";
import type {
  InquiryAssignmentStatus,
  InquiryPriority,
  InquirySource,
  InquiryStatus,
} from "@/lib/types";

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const tones: Record<InquiryStatus, string> = {
    NEW: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
    IN_PROGRESS:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    QUOTED:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    CONVERTED: "border-primary/20 bg-primary/10 text-primary",
    CLOSED: "border-border bg-muted text-muted-foreground",
    CANCELLED: "border-destructive/20 bg-destructive/10 text-destructive",
  };
  return (
    <Badge variant="outline" className={tones[status]}>
      {inquiryStatusLabel(status)}
    </Badge>
  );
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
