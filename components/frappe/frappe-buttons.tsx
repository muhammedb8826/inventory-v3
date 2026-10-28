import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const frappePrimary =
  "h-10 rounded-lg border-0 bg-[var(--frappe-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--frappe-primary-hover)]";

const frappeSecondary =
  "h-10 rounded-lg border border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-4 text-sm font-medium text-[var(--frappe-text)] shadow-none hover:bg-[var(--frappe-section-head)]";

export function FrappeButtonPrimary({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button className={cn(frappePrimary, className)} {...props} />;
}

export function FrappeButtonSecondary({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" className={cn(frappeSecondary, className)} {...props} />
  );
}

export function FrappeButtonLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button variant="outline" className={cn(frappeSecondary, className)} asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
