"use client";

import { SiteInquiryForm } from "@/components/site/site-inquiry-form";
import { useBranding } from "@/components/branding/branding-provider";

export default function HomePage() {
  const { appName, heroImageSrc, headline, supportingText } = useBranding();

  return (
    <>
      <section className="relative flex min-h-svh items-end overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageSrc}
            alt={`${appName} showroom`}
            className="site-hero-media h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--site-ink) 35%, transparent) 0%, var(--site-hero-veil) 55%, color-mix(in oklab, var(--site-ink) 82%, transparent) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-32 sm:px-8 sm:pb-20">
          <p className="site-display site-animate-rise text-4xl font-semibold text-white sm:text-5xl md:text-6xl">
            {appName}
          </p>
          <div className="site-rule mt-4 h-px w-24 bg-white/70" />
          <h1 className="site-display site-animate-rise site-animate-rise-delay-1 mt-6 max-w-2xl text-3xl font-medium leading-tight text-white sm:text-4xl md:text-[2.75rem]">
            {headline}
          </h1>
          <p className="site-animate-rise site-animate-rise-delay-2 mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
            {supportingText}
          </p>
          <div className="site-animate-rise site-animate-rise-delay-3 mt-8">
            <a
              href="#inquire"
              className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[var(--site-ink)] transition-colors hover:bg-white/90"
            >
              Request a quote
            </a>
          </div>
        </div>
      </section>

      <section
        id="inquire"
        className="scroll-mt-8 border-t border-[var(--site-line)]"
      >
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-20">
          <div>
            <h2
              id="inquire-heading"
              className="site-display text-3xl font-semibold text-[var(--site-ink)] sm:text-4xl"
            >
              Inquiry
            </h2>
            <p className="mt-3 max-w-md text-[var(--site-ink-soft)] leading-relaxed">
              Describe the item or project. We use this form to open a ticket
              for our sales team — no account required.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-[var(--site-ink-soft)]">
              <li className="flex gap-3">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--site-accent)]"
                  aria-hidden
                />
                Quotes for furniture, appliances, and stocked goods
              </li>
              <li className="flex gap-3">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--site-accent)]"
                  aria-hidden
                />
                Follow-up by phone or email — whichever you share
              </li>
              <li className="flex gap-3">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--site-accent)]"
                  aria-hidden
                />
                Usually answered within one business day
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--site-line)] bg-[var(--site-surface)] p-6 shadow-[0_1px_0_color-mix(in_oklab,var(--site-ink)_6%,transparent)] sm:p-8">
            <SiteInquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
