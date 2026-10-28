"use client";
import Link from "next/link";
import { MoreHorizontalIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export type RowAction = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
};
export function RowActionsMenu({
  label,
  actions,
  description,
}: {
  label: string;
  actions: RowAction[];
  description?: string;
}) {
  if (!actions.length) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="row-actions-trigger size-11 sm:size-9 rounded-lg text-muted-foreground hover:bg-primary/8 hover:text-primary"
          aria-label={`Actions for ${label}`}
          title="More actions"
        >
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-56 rounded-xl p-1.5 shadow-xl"
      >
        <DropdownMenuLabel className="truncate px-2.5 pb-2 text-xs font-medium text-muted-foreground">
          {label}
          {description && (
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              {description}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action, i) => (
          <div key={action.label}>
            {action.destructive && i > 0 && !actions[i - 1].destructive && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              className="min-h-10 gap-2.5 rounded-lg px-2.5"
              variant={action.destructive ? "destructive" : "default"}
              disabled={action.disabled}
              title={action.hint}
              asChild={!!action.href}
              onSelect={action.href ? undefined : action.onSelect}
            >
              {action.href ? (
                <Link href={action.href}>
                  {action.icon && <action.icon className="size-4" />}
                  {action.label}
                </Link>
              ) : (
                <>
                  {action.icon && <action.icon className="size-4" />}
                  {action.label}
                </>
              )}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
