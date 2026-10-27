"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";
import { ListSearchField } from "@/components/shared/list-search-field";
import { FrappeFilterBar, FrappeListToolbar } from "@/components/frappe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage, formatDate, formatRelativeDate } from "@/lib/format";
import {
  buildMessagesListPath,
  deleteMessage,
  fetchMessage,
  markMessageRead,
  sendMessage,
} from "@/lib/messages";
import { hasPermission } from "@/lib/permissions";
import type { InternalMessage, UserAdmin } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  InboxIcon,
  PenSquareIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const [selected, setSelected] = useState<InternalMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const canWrite = hasPermission(user, "messages.write");

  const { rows, meta, setPage, loading, reload } =
    usePaginatedList<InternalMessage>(
      (page, limit) =>
        buildMessagesListPath(
          {
            folder,
            search: debouncedSearch || undefined,
            unreadOnly: folder === "inbox" ? unreadOnly : false,
          },
          page,
          limit
        ),
      [folder, debouncedSearch, unreadOnly]
    );

  const openMessage = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        let msg = await fetchMessage(id);
        if (!msg.isRead && msg.recipientId === user?.id) {
          msg = await markMessageRead(id);
          void reload();
        }
        setSelected(msg);
        router.replace(`/messages?id=${encodeURIComponent(id)}`, {
          scroll: false,
        });
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setDetailLoading(false);
      }
    },
    [reload, router, user?.id]
  );

  useEffect(() => {
    if (selectedId) void openMessage(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open when query id changes
  }, [selectedId]);

  async function onDelete(id: string) {
    try {
      await deleteMessage(id);
      toast.success("Message deleted");
      setSelected(null);
      router.replace("/messages", { scroll: false });
      void reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <AppShell
      title="Messages"
      subtitle="Internal chat for your team"
      breadcrumbs={[
        { label: "Operations", href: "/dashboard" },
        { label: "Messages" },
      ]}
      actions={
        canWrite ? (
          <ComposeMessageDialog
            onSent={() => {
              setFolder("sent");
              void reload();
            }}
          />
        ) : null
      }
    >
      <PermissionGate permission="messages.read" showDenied>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="sms-panel overflow-hidden">
            <Tabs
              value={folder}
              onValueChange={(v) => {
                setFolder(v as "inbox" | "sent");
                setSelected(null);
                router.replace("/messages", { scroll: false });
              }}
              className="gap-0"
            >
              <div className="border-b border-[var(--frappe-border)] px-3 pt-3">
                <TabsList className="h-10 w-full rounded-xl bg-[var(--frappe-section-head)] p-1">
                  <TabsTrigger value="inbox" className="flex-1 rounded-lg gap-1.5">
                    <InboxIcon className="size-3.5" />
                    Inbox
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="flex-1 rounded-lg gap-1.5">
                    <SendIcon className="size-3.5" />
                    Sent
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value={folder} className="mt-0 space-y-0">
                <div className="space-y-3 p-3">
                  <FrappeFilterBar className="mb-0 shadow-none">
                    <ListSearchField
                      value={search}
                      onChange={setSearch}
                      placeholder="Search messages…"
                    />
                    {folder === "inbox" ? (
                      <label className="flex items-center gap-2 text-sm text-[var(--frappe-text-muted)]">
                        <input
                          type="checkbox"
                          checked={unreadOnly}
                          onChange={(e) => setUnreadOnly(e.target.checked)}
                          className="size-4 rounded border-[var(--frappe-border)]"
                        />
                        Unread only
                      </label>
                    ) : null}
                  </FrappeFilterBar>
                  <FrappeListToolbar className="mb-0">
                    <span className="text-[var(--frappe-text-muted)]">
                      {meta.total} message{meta.total === 1 ? "" : "s"}
                    </span>
                  </FrappeListToolbar>
                </div>
                {loading ? (
                  <PageLoading />
                ) : rows.length === 0 ? (
                  <p className="px-4 py-16 text-center text-sm text-[var(--frappe-text-muted)]">
                    No messages in {folder}
                  </p>
                ) : (
                  <ul className="max-h-[calc(100vh-22rem)] divide-y divide-[var(--frappe-border)] overflow-y-auto">
                    {rows.map((msg) => {
                      const peer =
                        folder === "inbox" ? msg.sender : msg.recipient;
                      const active = selected?.id === msg.id;
                      return (
                        <li key={msg.id}>
                          <button
                            type="button"
                            onClick={() => void openMessage(msg.id)}
                            className={cn(
                              "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-[var(--frappe-section-head)]",
                              active && "bg-teal-500/8",
                              folder === "inbox" &&
                                !msg.isRead &&
                                "border-l-2 border-l-teal-600"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-[var(--frappe-text)]">
                                {peer?.fullName ?? "User"}
                              </span>
                              <span className="shrink-0 text-[11px] text-[var(--frappe-text-muted)]">
                                {formatRelativeDate(msg.createdAt)}
                              </span>
                            </div>
                            <span className="line-clamp-2 text-sm text-[var(--frappe-text-muted)]">
                              {msg.body}
                            </span>
                            {folder === "inbox" && !msg.isRead ? (
                              <Badge className="mt-1 w-fit rounded-md bg-teal-600/15 text-[10px] text-teal-700 dark:text-teal-300">
                                Unread
                              </Badge>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {meta.totalPages > 1 ? (
                  <div className="flex items-center justify-between border-t border-[var(--frappe-border)] px-3 py-2 text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page <= 1 || loading}
                      onClick={() => setPage(meta.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-[var(--frappe-text-muted)]">
                      Page {meta.page} / {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page >= meta.totalPages || loading}
                      onClick={() => setPage(meta.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>

          <div className="sms-panel flex min-h-[28rem] flex-col overflow-hidden">
            {detailLoading ? (
              <PageLoading />
            ) : selected ? (
              <>
                <div className="border-b border-[var(--frappe-border)] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-heading text-lg font-semibold text-[var(--frappe-text)]">
                        {selected.sender?.fullName ?? "Message"}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--frappe-text-muted)]">
                        To{" "}
                        <span className="font-medium text-[var(--frappe-text)]">
                          {selected.recipient?.fullName}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--frappe-text-muted)]">
                        {formatDate(selected.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                      onClick={() => void onDelete(selected.id)}
                      aria-label="Delete message"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto whitespace-pre-wrap px-5 py-5 text-sm leading-relaxed text-[var(--frappe-text)]">
                  {selected.body}
                </div>
                {canWrite && selected.senderId !== user?.id ? (
                  <div className="border-t border-[var(--frappe-border)] p-4">
                    <ComposeMessageDialog
                      replyTo={selected}
                      onSent={() => {
                        setFolder("sent");
                        void reload();
                      }}
                      trigger={
                        <Button variant="outline" className="rounded-xl">
                          <PenSquareIcon className="size-4" />
                          Reply
                        </Button>
                      }
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--frappe-section-head)] text-[var(--frappe-text-muted)]">
                  <InboxIcon className="size-6" />
                </span>
                <p className="font-medium text-[var(--frappe-text)]">
                  Select a message
                </p>
                <p className="max-w-xs text-sm text-[var(--frappe-text-muted)]">
                  Choose a conversation from the list, or compose a new note to
                  a teammate.
                </p>
              </div>
            )}
          </div>
        </div>
      </PermissionGate>
    </AppShell>
  );
}

function ComposeMessageDialog({
  onSent,
  replyTo,
  trigger,
}: {
  onSent: () => void;
  replyTo?: InternalMessage;
  trigger?: React.ReactNode;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState(replyTo?.senderId ?? "");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: assignees } = useFetch(
    () => api<UserAdmin[]>("/users/assignees"),
    [open],
    { enabled: open }
  );

  const recipients = useMemo(
    () => (assignees ?? []).filter((u) => u.id !== user?.id && u.isActive !== false),
    [assignees, user?.id]
  );

  useEffect(() => {
    if (open && replyTo) {
      setRecipientId(replyTo.senderId);
    }
  }, [open, replyTo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientId) {
      toast.error("Choose a recipient");
      return;
    }
    setSaving(true);
    try {
      await sendMessage({
        recipientId,
        body: body.trim(),
      });
      toast.success("Message sent");
      setOpen(false);
      setBody("");
      if (!replyTo) {
        setRecipientId("");
      }
      onSent();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-9 rounded-xl bg-teal-700 hover:bg-teal-600">
            <PenSquareIcon className="size-4" />
            Compose
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{replyTo ? "Reply" : "New message"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>To</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Select teammate" />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName} · {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="msg-body">Message</Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={6}
              className="rounded-xl"
              placeholder="Write a note to your teammate…"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-700 hover:bg-teal-600"
            >
              {saving ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
