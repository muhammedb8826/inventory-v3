import { api } from "@/lib/api";
import type { BrandingSettings, UpdateBrandingBody } from "@/lib/types";

export const DEFAULT_APP_NAME = "Stock";
export const DEFAULT_HERO_IMAGE = "/background-image.webp";
export const DEFAULT_HEADLINE =
  "Tell us what you need. We will send a clear quote.";
export const DEFAULT_SUPPORTING_TEXT =
  "Share a product question or custom request — our team replies by phone or email.";

export const DEFAULT_BRANDING: BrandingSettings = {
  appName: DEFAULT_APP_NAME,
  heroImageUrl: null,
  headline: DEFAULT_HEADLINE,
  supportingText: DEFAULT_SUPPORTING_TEXT,
};

/** API origin without trailing `/api` (for uploaded asset URLs). */
export function getApiOrigin(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
  return base.replace(/\/api\/?$/, "");
}

/**
 * Resolve a branding asset URL from the API.
 * Accepts absolute URLs, `/uploads/...` paths, or null (fallback).
 */
export function resolveBrandingAssetUrl(
  url: string | null | undefined,
  fallback: string = DEFAULT_HERO_IMAGE
): string {
  if (!url || !url.trim()) return fallback;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${getApiOrigin()}${trimmed}`;
  }
  return `${getApiOrigin()}/${trimmed}`;
}

export function normalizeBranding(
  raw?: Partial<BrandingSettings> | null
): BrandingSettings {
  const appName = raw?.appName?.trim() || DEFAULT_APP_NAME;
  return {
    appName,
    heroImageUrl: raw?.heroImageUrl?.trim() || null,
    headline: raw?.headline?.trim() || DEFAULT_HEADLINE,
    supportingText: raw?.supportingText?.trim() || DEFAULT_SUPPORTING_TEXT,
    updatedAt: raw?.updatedAt,
  };
}

export async function fetchPublicBranding(): Promise<BrandingSettings> {
  try {
    const data = await api<BrandingSettings>("/public/branding", {
      auth: false,
    });
    return normalizeBranding(data);
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export async function fetchAdminBranding(): Promise<BrandingSettings> {
  const data = await api<BrandingSettings>("/settings/branding");
  return normalizeBranding(data);
}

export async function updateBranding(
  body: UpdateBrandingBody
): Promise<BrandingSettings> {
  const data = await api<BrandingSettings>("/settings/branding", {
    method: "PATCH",
    body,
  });
  return normalizeBranding(data);
}

export async function uploadHeroImage(file: File): Promise<BrandingSettings> {
  const form = new FormData();
  form.append("file", file);
  const data = await api<BrandingSettings>("/settings/branding/hero-image", {
    method: "POST",
    body: form,
  });
  return normalizeBranding(data);
}

export async function clearHeroImage(): Promise<BrandingSettings> {
  const data = await api<BrandingSettings>("/settings/branding/hero-image", {
    method: "DELETE",
  });
  return normalizeBranding(data);
}
