"use client";

import Link from "next/link";
import { SiteInquiryForm } from "@/components/site/site-inquiry-form";
import { useBranding } from "@/components/branding/branding-provider";

export default function ContactPage() {
  const { appName } = useBranding();

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
      <div className="mb-10 max-w-xl">
        <p className="text-sm font-medium text-[var(--site-accent)]">
          <Link href="/" className="hover:underline">
            ← Back to {appName}
          </Link>
        </p>
        <h1
          id="contact-heading"
          className="site-display mt-4 text-4xl font-semibold text-[var(--site-ink)] sm:text-5xl"
        >
          Contact
        </h1>
        <p className="mt-3 text-[var(--site-ink-soft)] leading-relaxed">
          Send a product question or quote request. We will follow up shortly.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <aside className="space-y-4 text-sm text-[var(--site-ink-soft)]">
          <p>
            Prefer the short path? The same form lives on the{" "}
            <Link
              href="/#inquire"
              className="font-medium text-[var(--site-accent)] underline-offset-4 hover:underline"
            >
              home page
            </Link>
            .
          </p>
          <p>
            Include a phone number or email so our team can reach you. Staff
            members should{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--site-accent)] underline-offset-4 hover:underline"
            >
              sign in
            </Link>{" "}
            instead.
          </p>
        </aside>

        <div className="rounded-xl border border-[var(--site-line)] bg-[var(--site-surface)] p-6 sm:p-8">
          <SiteInquiryForm headingId="contact-heading" />
        </div>
      </div>
    </div>
  );
}
