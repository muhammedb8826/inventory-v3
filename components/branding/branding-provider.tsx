"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_BRANDING,
  DEFAULT_HERO_IMAGE,
  fetchPublicBranding,
  resolveBrandingAssetUrl,
} from "@/lib/branding";
import type { BrandingSettings } from "@/lib/types";

interface BrandingContextValue {
  branding: BrandingSettings;
  appName: string;
  heroImageSrc: string;
  headline: string;
  supportingText: string;
  loading: boolean;
  reload: () => Promise<void>;
  setBranding: (next: BrandingSettings) => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchPublicBranding();
      setBranding(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      appName: branding.appName,
      heroImageSrc: resolveBrandingAssetUrl(
        branding.heroImageUrl,
        DEFAULT_HERO_IMAGE
      ),
      headline: branding.headline ?? DEFAULT_BRANDING.headline!,
      supportingText:
        branding.supportingText ?? DEFAULT_BRANDING.supportingText!,
      loading,
      reload,
      setBranding,
    }),
    [branding, loading, reload]
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return {
      branding: DEFAULT_BRANDING,
      appName: DEFAULT_BRANDING.appName,
      heroImageSrc: DEFAULT_HERO_IMAGE,
      headline: DEFAULT_BRANDING.headline!,
      supportingText: DEFAULT_BRANDING.supportingText!,
      loading: false,
      reload: async () => undefined,
      setBranding: () => undefined,
    };
  }
  return ctx;
}
