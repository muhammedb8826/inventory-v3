"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCheckIcon,
  Loader2Icon,
  MessageSquareIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  buildMessagesListPath,
  fetchMessages,
  fetchUnreadMessageCount,
  markAllMessagesRead,
  markMessageRead,
} from "@/lib/messages";
import { errorMessage, formatRelativeDate } from "@/lib/format";
import type { InternalMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function MessagesBell() {
  const { user } = useAuth();
  const canRead = hasPermission(user, "messages.read");
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [rows, setRows] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    if (!canRead) return;
    try {
      const res = await fetchUnreadMessageCount();
      setCount(res.count);
    } catch {
      /* ignore */
    }
  }, [canRead]);

  const refreshList = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await fetchMessages(
        buildMessagesListPath({ folder: "inbox" }, 1, 8)
      );
      setRows(res.data);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    if (!canRead) return;
    void refreshCount();
    const id = window.setInterval(() => void refreshCount(), 45000);
    return () => window.clearInterval(id);
  }, [canRead, refreshCount]);

  useEffect(() => {
    if (open) {
      void refreshList();
      void refreshCount();
    }
  }, [open, refreshList, refreshCount]);

  if (!canRead) return null;

  async function onMarkAll() {
    try {
      const res = await markAllMessagesRead();
      setCount(res.count);
      await refreshList();
      toast.success("All messages marked read");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function onOpenMessage(msg: InternalMessage) {
    if (!msg.isRead) {
      try {
        await markMessageRead(msg.id);
        setCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-xl text-[var(--frappe-text-muted)] hover:bg-[var(--frappe-section-head)] hover:text-[var(--frappe-text)]"
          aria-label="Messages"
        >
          <MessageSquareIcon className="size-4" />
          {count > 0 ? (
            <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-teal-600 px-1 text-[10px] text-white hover:bg-teal-600">
              {count > 99 ? "99+" : count}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">Messages</p>
            <p className="text-xs text-muted-foreground">
              {count} unread
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => void onMarkAll()}
              disabled={count === 0}
            >
              <CheckCheckIcon className="size-3.5" />
              Read all
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/messages" onClick={() => setOpen(false)}>
                Open
              </Link>
            </Button>
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              Inbox is empty
            </p>
          ) : (
            rows.map((msg) => (
              <Link
                key={msg.id}
                href={`/messages?id=${encodeURIComponent(msg.id)}`}
                onClick={() => void onOpenMessage(msg)}
                className={cn(
                  "block rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/70",
                  !msg.isRead && "bg-teal-500/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {msg.sender?.fullName ?? "Colleague"}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatRelativeDate(msg.createdAt)}
                  </span>
                </div>
                <p className="truncate text-sm text-foreground/90">
                  {msg.subject}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {msg.body}
                </p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
