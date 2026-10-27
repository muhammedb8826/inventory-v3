"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import {
  FormField,
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/components/branding/branding-provider";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  clearHeroImage,
  DEFAULT_HERO_IMAGE,
  fetchAdminBranding,
  resolveBrandingAssetUrl,
  updateBranding,
  uploadHeroImage,
} from "@/lib/branding";
import { isForbiddenError } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { BrandingSettings } from "@/lib/types";
import { toast } from "sonner";
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function BrandingSettingsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "settings.write");
  const { reload: reloadPublicBranding, setBranding: setPublicBranding } =
    useBranding();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [appName, setAppName] = useState("");
  const [headline, setHeadline] = useState("");
  const [supportingText, setSupportingText] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  function applyBranding(data: BrandingSettings) {
    setAppName(data.appName);
    setHeadline(data.headline ?? "");
    setSupportingText(data.supportingText ?? "");
    setHeroImageUrl(data.heroImageUrl ?? null);
    setPublicBranding(data);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchAdminBranding();
        if (!cancelled) applyBranding(data);
      } catch (err) {
        if (!cancelled && !isForbiddenError(err)) {
          toast.error(errorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (!appName.trim()) {
      toast.error("App name is required");
      return;
    }
    setSaving(true);
    try {
      const data = await updateBranding({
        appName: appName.trim(),
        headline: headline.trim() || null,
        supportingText: supportingText.trim() || null,
      });
      applyBranding(data);
      await reloadPublicBranding();
      toast.success("Branding saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    if (!canWrite) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use a JPEG, PNG, WebP, or GIF image");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setPreviewObjectUrl(URL.createObjectURL(file));

    setUploading(true);
    try {
      const data = await uploadHeroImage(file);
      applyBranding(data);
      await reloadPublicBranding();
      toast.success("Hero image uploaded");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleClearImage() {
    if (!canWrite) return;
    if (!confirm("Remove the custom hero image and use the default?")) return;
    setClearing(true);
    try {
      const data = await clearHeroImage();
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        setPreviewObjectUrl(null);
      }
      applyBranding(data);
      await reloadPublicBranding();
      toast.success("Hero image cleared");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setClearing(false);
    }
  }

  const previewSrc =
    previewObjectUrl ||
    resolveBrandingAssetUrl(heroImageUrl, DEFAULT_HERO_IMAGE);

  return (
    <AppShell
      title="Branding"
      subtitle="Public site name and hero image shown to customers"
      breadcrumbs={[
        { label: "Home", href: "/dashboard" },
        { label: "Branding" },
      ]}
    >
      <PermissionGate
        permissions={["settings.read", "settings.write"]}
        showDenied
      >
        {loading ? (
          <PageLoading />
        ) : (
          <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-4">
            <PageFormCard>
              <PageFormSection
                title="App name"
                description="Shown on the public site, login screen, and sidebar."
              >
                <FormGrid cols={1}>
                  <FormField label="App name" required>
                    <Input
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      required
                      maxLength={80}
                      placeholder="Stock"
                      disabled={!canWrite}
                    />
                  </FormField>
                  <FormField label="Headline">
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      maxLength={160}
                      placeholder="Tell us what you need…"
                      disabled={!canWrite}
                    />
                  </FormField>
                  <FormField label="Supporting text">
                    <Textarea
                      value={supportingText}
                      onChange={(e) => setSupportingText(e.target.value)}
                      rows={3}
                      maxLength={400}
                      disabled={!canWrite}
                    />
                  </FormField>
                </FormGrid>
              </PageFormSection>

              <PageFormSection
                title="Hero image"
                description="Full-bleed background on the customer landing page. JPEG, PNG, WebP, or GIF up to 5 MB."
              >
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt="Hero preview"
                      className="aspect-[21/9] w-full object-cover"
                    />
                  </div>
                  {canWrite ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept={ACCEPTED_TYPES.join(",")}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(file);
                        }}
                      />
                      <Button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        <UploadIcon className="size-3.5" />
                        {uploading ? "Uploading…" : "Upload image"}
                      </Button>
                      {heroImageUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-destructive"
                          disabled={clearing}
                          onClick={() => void handleClearImage()}
                        >
                          <Trash2Icon className="size-3.5" />
                          {clearing ? "Clearing…" : "Use default"}
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ImageIcon className="size-3.5" />
                          Using built-in default image
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </PageFormSection>
            </PageFormCard>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/" target="_blank" rel="noreferrer">
                  Preview site
                </Link>
              </Button>
              {canWrite ? (
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save branding"}
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </PermissionGate>
    </AppShell>
  );
}
