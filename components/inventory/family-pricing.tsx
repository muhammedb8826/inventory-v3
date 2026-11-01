"use client";
import { useState } from "react";
import {
  PageFormCard,
  PageFormSection,
  FormField,
} from "@/components/shared/page-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { errorMessage, formatUnitPrice } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { ProductFamily, ProductAttribute } from "@/lib/product-variants";
import { toast } from "sonner";
export function FamilyPricing({
  family,
  definitions,
  onSaved,
}: {
  family: ProductFamily;
  definitions: ProductAttribute[];
  onSaved: () => unknown;
}) {
  const { user } = useAuth(),
    canWrite = hasPermission(user, "pricing.write");
  const [base, setBase] = useState(family.priceRules?.basePrice ?? ""),
    [busy, setBusy] = useState(false);
  const [extras, setExtras] = useState(() =>
    family.attributes.flatMap((a) =>
      a.values.map((value) => ({
        attributeId: a.attributeId,
        value,
        extra:
          family.priceRules?.extras.find(
            (e) => e.attributeId === a.attributeId && e.value === value,
          )?.extra ?? "0",
      })),
    ),
  );
  return (
    <PageFormCard>
      <PageFormSection
        title="Sales price & variant surcharges"
        description="Each variant uses the family base price plus the extra price for its selected attribute values. A separately configured variant price takes precedence."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api(`/product-families/${family.id}/pricing`, {
                method: "PATCH",
                body: {
                  basePrice: base === "" ? null : Number(base),
                  extras: extras.map((e) => ({ ...e, extra: Number(e.extra) })),
                },
              });
              toast.success("Family prices updated");
              onSaved();
            } catch (e) {
              toast.error(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormField label={`Base price per ${family.stockUnit.symbol}`}>
            <Input
              aria-label="Family base sales price"
              type="number"
              min="0"
              step="any"
              value={base}
              disabled={!canWrite}
              onChange={(e) => setBase(e.target.value)}
              placeholder="No price — approval required"
            />
          </FormField>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="p-3">Attribute</th>
                  <th className="p-3">Value</th>
                  <th className="p-3">Extra price</th>
                </tr>
              </thead>
              <tbody>
                {extras.map((e, i) => (
                  <tr key={`${e.attributeId}:${e.value}`} className="border-b">
                    <td className="p-3">
                      {definitions.find((d) => d.id === e.attributeId)?.name ??
                        "Attribute"}
                    </td>
                    <td className="p-3">{e.value}</td>
                    <td className="p-3">
                      <Input
                        aria-label={`Extra price for ${e.value}`}
                        className="min-w-24 max-w-40"
                        type="number"
                        min="0"
                        step="any"
                        disabled={!canWrite}
                        value={e.extra}
                        onChange={(event) =>
                          setExtras((old) =>
                            old.map((r, j) =>
                              i === j ? { ...r, extra: event.target.value } : r,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {base === ""
              ? "A missing base price requires sales approval."
              : `Base price: ${formatUnitPrice(base)}. Existing quotations keep their approved price snapshot.`}
          </p>
          {canWrite && (
            <Button className="mt-4" disabled={busy}>
              Save family prices
            </Button>
          )}
        </form>
      </PageFormSection>
    </PageFormCard>
  );
}
