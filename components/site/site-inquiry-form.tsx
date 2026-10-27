"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type {
  CreatePublicInquiryBody,
  InquiryLineInput,
  PaginatedResponse,
  PublicCatalogItem,
  PublicInquiryResponse,
} from "@/lib/types";

type SelectedLine = {
  itemId: string;
  description: string;
  quantity: string;
};

type SiteInquiryFormProps = {
  headingId?: string;
};

/** Next.js requires a Suspense boundary around `useSearchParams` for static prerender. */
export function SiteInquiryForm(props: SiteInquiryFormProps) {
  return (
    <Suspense
      fallback={
        <div
          className="h-64 animate-pulse rounded-md bg-[var(--site-line)]/40"
          aria-hidden
        />
      }
    >
      <SiteInquiryFormInner {...props} />
    </Suspense>
  );
}

function SiteInquiryFormInner({
  headingId = "inquire-heading",
}: SiteInquiryFormProps) {
  const searchParams = useSearchParams();
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalog, setCatalog] = useState<PublicCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const itemId = searchParams.get("itemId");
    if (!itemId || selectedLines.some((l) => l.itemId === itemId)) return;
    let cancelled = false;
    api<PaginatedResponse<PublicCatalogItem>>("/public/catalog?limit=50", {
      auth: false,
    })
      .then((res) => {
        if (cancelled) return;
        const match = res.data.find((item) => item.id === itemId);
        if (match) {
          setSelectedLines((prev) =>
            prev.some((l) => l.itemId === match.id)
              ? prev
              : [
                  ...prev,
                  {
                    itemId: match.id,
                    description: match.description,
                    quantity: "1",
                  },
                ]
          );
        }
      })
      .catch(() => {
        /* ignore prefill failures */
      });
    return () => {
      cancelled = true;
    };
    // Prefill once from URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setCatalogLoading(true);
      const q = catalogSearch.trim()
        ? `?search=${encodeURIComponent(catalogSearch.trim())}&limit=20`
        : "?limit=20";
      api<PaginatedResponse<PublicCatalogItem>>(`/public/catalog${q}`, {
        auth: false,
      })
        .then((res) => {
          if (!cancelled) setCatalog(res.data);
        })
        .catch(() => {
          if (!cancelled) setCatalog([]);
        })
        .finally(() => {
          if (!cancelled) setCatalogLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [catalogSearch]);

  function addCatalogItem(item: PublicCatalogItem) {
    setSelectedLines((prev) => {
      if (prev.some((l) => l.itemId === item.id)) return prev;
      return [
        ...prev,
        { itemId: item.id, description: item.description, quantity: "1" },
      ];
    });
  }

  function removeLine(itemId: string) {
    setSelectedLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!phone.trim() && !email.trim()) {
      setError("Please include a phone number or email so we can reply.");
      return;
    }

    setLoading(true);
    try {
      const lines: InquiryLineInput[] = selectedLines
        .map((line) => {
          const qty = parseFloat(line.quantity);
          const payload: InquiryLineInput = { itemId: line.itemId };
          if (!Number.isNaN(qty) && qty > 0) payload.quantity = qty;
          return payload;
        })
        .filter((l) => l.itemId);

      const body: CreatePublicInquiryBody = {
        contactName: contactName.trim(),
        subject: subject.trim(),
        message: message.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        lines: lines.length ? lines : undefined,
      };
      const res = await api<PublicInquiryResponse>("/public/inquiries", {
        method: "POST",
        body,
        auth: false,
      });
      setSuccess(res.message || "Inquiry submitted successfully");
      setContactName("");
      setPhone("");
      setEmail("");
      setSubject("");
      setMessage("");
      setSelectedLines([]);
      setCatalogSearch("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-md border border-[var(--site-line)] bg-[var(--site-surface)] px-3.5 py-2.5 text-[15px] text-[var(--site-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--site-ink-soft)]/70 focus:border-[var(--site-accent)] focus:shadow-[0_0_0_3px_var(--site-accent-soft)]";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      aria-labelledby={headingId}
    >
      <div className="space-y-2">
        <label
          htmlFor="site-name"
          className="block text-sm font-medium text-[var(--site-ink)]"
        >
          Your name
        </label>
        <input
          id="site-name"
          required
          autoComplete="name"
          className={fieldClass}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="site-phone"
            className="block text-sm font-medium text-[var(--site-ink)]"
          >
            Phone
          </label>
          <input
            id="site-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="0911…"
            className={fieldClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="site-email"
            className="block text-sm font-medium text-[var(--site-ink)]"
          >
            Email
          </label>
          <input
            id="site-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-[var(--site-ink-soft)]">
        Include at least one way for us to reach you — phone or email.
      </p>

      <div className="space-y-2">
        <label
          htmlFor="site-subject"
          className="block text-sm font-medium text-[var(--site-ink)]"
        >
          Subject
        </label>
        <input
          id="site-subject"
          required
          placeholder="Quote for a dining set"
          className={fieldClass}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-[var(--site-ink)]">
          Products of interest
          <span className="font-normal text-[var(--site-ink-soft)]">
            {" "}
            (optional)
          </span>
        </span>
        <input
          type="search"
          placeholder="Search catalog…"
          className={fieldClass}
          value={catalogSearch}
          onChange={(e) => setCatalogSearch(e.target.value)}
        />
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[var(--site-line)] p-2">
          {catalogLoading ? (
            <p className="px-1 py-2 text-sm text-[var(--site-ink-soft)]">
              Loading…
            </p>
          ) : catalog.length === 0 ? (
            <p className="px-1 py-2 text-sm text-[var(--site-ink-soft)]">
              No products found
            </p>
          ) : (
            catalog.map((item) => {
              const selected = selectedLines.some((l) => l.itemId === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={selected}
                  onClick={() => addCatalogItem(item)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-[var(--site-ink)] hover:bg-[var(--site-accent-soft)] disabled:opacity-50"
                >
                  <span className="truncate">
                    {item.description}
                    {item.sku ? (
                      <span className="text-[var(--site-ink-soft)]">
                        {" "}
                        · {item.sku}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--site-accent)]">
                    {selected ? "Added" : "Add"}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {selectedLines.length > 0 ? (
          <ul className="space-y-2">
            {selectedLines.map((line) => (
              <li
                key={line.itemId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--site-line)] px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-[var(--site-ink)]">
                  {line.description}
                </span>
                <label className="flex items-center gap-1 text-[var(--site-ink-soft)]">
                  Qty
                  <input
                    type="number"
                    min={0.001}
                    step="any"
                    className="w-20 rounded border border-[var(--site-line)] bg-[var(--site-surface)] px-2 py-1 text-[var(--site-ink)]"
                    value={line.quantity}
                    onChange={(e) =>
                      setSelectedLines((prev) =>
                        prev.map((l) =>
                          l.itemId === line.itemId
                            ? { ...l, quantity: e.target.value }
                            : l
                        )
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-xs text-[#a33a2f]"
                  onClick={() => removeLine(line.itemId)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="site-message"
          className="block text-sm font-medium text-[var(--site-ink)]"
        >
          Message
        </label>
        <textarea
          id="site-message"
          required
          rows={5}
          placeholder="Tell us what you need — size, quantity, timeline…"
          className={`${fieldClass} resize-y min-h-[8rem]`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-[#a33a2f]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-md bg-[var(--site-accent-soft)] px-3 py-2.5 text-sm text-[var(--site-accent)]"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--site-accent)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--site-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
