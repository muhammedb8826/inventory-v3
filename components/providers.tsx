"use client";

import { AuthProvider } from "@/lib/auth";
import { BrandingProvider } from "@/components/branding/branding-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <BrandingProvider>
            {children}
            <Toaster richColors position="top-right" />
          </BrandingProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
