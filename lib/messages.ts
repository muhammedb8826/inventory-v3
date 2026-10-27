import { api } from "@/lib/api";
import { buildListPath } from "@/lib/list-query";
import type {
  InternalMessage,
  MessageUnreadCount,
  PaginatedResponse,
} from "@/lib/types";

export function buildMessagesListPath(
  params?: {
    folder?: "inbox" | "sent";
    search?: string;
    unreadOnly?: boolean;
    from?: string;
    to?: string;
  },
  page?: number,
  limit?: number
) {
  return buildListPath("/messages", {
    params: {
      folder: params?.folder,
      search: params?.search,
      unreadOnly: params?.unreadOnly ? "true" : undefined,
      from: params?.from,
      to: params?.to,
    },
    page,
    limit,
  });
}

export function fetchUnreadMessageCount() {
  return api<MessageUnreadCount>("/messages/unread-count");
}

export function fetchMessages(
  path: string
): Promise<PaginatedResponse<InternalMessage>> {
  return api(path);
}

export function fetchMessage(id: string) {
  return api<InternalMessage>(`/messages/${id}`);
}

export function sendMessage(body: {
  recipientId: string;
  body: string;
}) {
  return api<InternalMessage>("/messages", { method: "POST", body });
}

export function markMessageRead(id: string) {
  return api<InternalMessage>(`/messages/${id}/read`, { method: "PATCH" });
}

export function markAllMessagesRead() {
  return api<MessageUnreadCount>("/messages/read-all", { method: "PATCH" });
}

export function deleteMessage(id: string) {
  return api<{ deleted: boolean }>(`/messages/${id}`, { method: "DELETE" });
}
