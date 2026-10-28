"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, ArrowUpRightIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mainNav, masterNav, adminNav } from "@/lib/navigation";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
export function WorkspaceSearch() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const items = useMemo(
    () =>
      [...mainNav, ...masterNav, ...adminNav].filter(
        (item) =>
          (item.permission
            ? hasPermission(user, item.permission)
            : item.permissions
              ? hasAnyPermission(user, item.permissions)
              : true) &&
          item.title.toLowerCase().includes(query.toLowerCase().trim()),
      ),
    [user, query],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="size-9 gap-2 rounded-xl border-border/70 bg-muted/35 p-0 text-muted-foreground shadow-none md:h-10 md:w-60 md:justify-start md:px-3 lg:w-72"
          aria-label="Search workspace"
        >
          <SearchIcon className="size-4" />
          <span className="hidden text-xs md:inline">Go to a page...</span>
          <kbd className="ml-auto hidden rounded border bg-card px-1.5 py-0.5 text-[10px] md:inline">
            Ctrl K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pb-4 pt-5">
          <DialogTitle>Go to a page</DialogTitle>
          <DialogDescription>
            Quickly find a section of your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="border-y bg-muted/25 px-5 py-3">
          <Input
            autoFocus
            aria-label="Search pages"
            placeholder="Search inventory, sales, reports..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <nav
          aria-label="Workspace search results"
          className="max-h-[min(60vh,440px)] space-y-1 overflow-y-auto p-2"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
            >
              <item.icon className="size-4 text-muted-foreground" />
              <span>{item.title}</span>
              <ArrowUpRightIcon className="ml-auto size-3.5 text-muted-foreground/60" />
            </Link>
          ))}
          {!items.length && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              No matching pages. Try another name.
            </p>
          )}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
