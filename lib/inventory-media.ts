import { api } from "@/lib/api";
import { resolveBrandingAssetUrl } from "@/lib/branding";
import type { StockRecord } from "@/lib/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export function resolveItemImageUrl(
  url: string | null | undefined
): string | null {
  if (!url?.trim()) return null;
  return resolveBrandingAssetUrl(url, url);
}

export function validateItemImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Use a JPEG, PNG, WebP, or GIF image";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 5 MB or smaller";
  }
  return null;
}

export async function uploadStockItemImage(
  stockId: string,
  file: File
): Promise<StockRecord> {
  const form = new FormData();
  form.append("file", file);
  return api<StockRecord>(`/inventory/${stockId}/image`, {
    method: "POST",
    body: form,
  });
}

export async function clearStockItemImage(
  stockId: string
): Promise<StockRecord> {
  return api<StockRecord>(`/inventory/${stockId}/image`, {
    method: "DELETE",
  });
}

export const ITEM_IMAGE_ACCEPT = ACCEPTED_TYPES.join(",");
