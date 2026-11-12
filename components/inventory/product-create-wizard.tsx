"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StockItemForm } from "@/components/inventory/stock-item-form";
import { FamilyVariantCreateForm } from "@/components/inventory/family-variant-create-form";

type CreateMode = "simple" | "variant";

export function ProductCreateWizard({
  locationId,
}: {
  locationId?: string;
}) {
  const [mode, setMode] = useState<CreateMode>("simple");

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border bg-card p-4 sm:p-5"
        aria-label="Product type"
      >
        <p className="text-sm font-medium">What are you creating?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Same pattern as Odoo / ERPNext: a simple product, or a variant from a
          configured product family (color, size, and other attributes).
        </p>
        <div
          className="mt-4 grid gap-3 sm:grid-cols-2"
          role="group"
          aria-label="Creation mode"
        >
          <button
            type="button"
            onClick={() => setMode("simple")}
            className={`rounded-xl border p-4 text-left transition ${
              mode === "simple"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "hover:bg-muted/40"
            }`}
          >
            <p className="font-medium">Simple product</p>
            <p className="mt-1 text-sm text-muted-foreground">
              One SKU. Name, unit, and optional opening stock.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("variant")}
            className={`rounded-xl border p-4 text-left transition ${
              mode === "variant"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "hover:bg-muted/40"
            }`}
          >
            <p className="font-medium">Product variant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a family and attribute values already configured (e.g.
              Color = Red).
            </p>
          </button>
        </div>
        {mode === "variant" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Need a new family first?{" "}
            <Link href="/products/new" className="text-primary underline">
              Create product family
            </Link>
            {" · "}
            <Link href="/product-attributes" className="text-primary underline">
              Attributes
            </Link>
          </p>
        )}
      </section>

      {mode === "simple" ? (
        <StockItemForm locationId={locationId} simplified />
      ) : (
        <FamilyVariantCreateForm locationId={locationId} />
      )}

      {mode === "simple" && (
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>Managing many colors or sizes?</span>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => setMode("variant")}
          >
            Switch to product variant
          </Button>
        </div>
      )}
    </div>
  );
}
