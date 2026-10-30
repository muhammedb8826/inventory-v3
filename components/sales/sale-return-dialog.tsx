"use client";
import type { components } from "@/lib/generated/api-schema";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/use-fetch";
import { apiList } from "@/lib/list-response";
import type { BankAccount } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { errorMessage, formatQty } from "@/lib/format";
import type { Sale, SaleLine } from "@/lib/types";
import { toast } from "sonner";
import { Undo2Icon } from "lucide-react";

export function SaleReturnDialog({
  sale,
  onSuccess,
}: {
  sale: Sale;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [returnUnits, setReturnUnits] = useState<Record<string, string>>({});
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [bankAccountId, setBankAccountId] = useState("");
  const { data: accounts } = useFetch(
    () => apiList<BankAccount>("/banks/accounts"),
    [],
  );
  const [saving, setSaving] = useState(false);

  const lines = useMemo(
    () => (sale.lines ?? []).filter((l) => l.id),
    [sale.lines],
  );

  function reset() {
    const next: Record<string, string> = {};
    for (const line of lines) {
      if (line.id) next[line.id] = "";
    }
    setQtys(next);
    setReturnUnits({});
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const returnLines: {
      saleLineId: string;
      quantity: number;
      unitId?: string;
    }[] = [];
    for (const line of lines) {
      if (!line.id) continue;
      const raw = qtys[line.id]?.trim();
      if (!raw) continue;
      const quantity = parseFloat(raw);
      if (!(quantity > 0)) {
        toast.error("Return quantities must be positive");
        return;
      }
      const sold = parseFloat(line.quantity);
      const unitId = returnUnits[line.id];
      const factor =
        unitId &&
        unitId !== line.item?.unitId &&
        unitId === line.unitSnapshot?.unitId
          ? Number(line.unitSnapshot.factor)
          : 1;
      if (quantity * factor > sold + 1e-9) {
        toast.error(
          `Return qty exceeds sold for ${line.item?.description ?? line.itemId}`,
        );
        return;
      }
      returnLines.push({
        saleLineId: line.id,
        quantity,
        ...(unitId && unitId !== "base" ? { unitId } : {}),
      });
    }
    if (returnLines.length === 0) {
      toast.error("Enter at least one return quantity");
      return;
    }
    setSaving(true);
    try {
      await api(`/sales/${sale.id}/returns`, {
        method: "POST",
        body: {
          lines: returnLines,
          bankAccountId: bankAccountId || undefined,
          notes: notes.trim() || undefined,
        } satisfies components["schemas"]["CreateSaleReturnDto"],
        idempotent: true,
      });
      toast.success("Return posted with stock and financial settlement");
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (sale.status === "VOIDED" || lines.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Undo2Icon className="size-3.5" />
          Return
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Customer return</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto py-4">
            <p className="text-sm text-muted-foreground">
              Unpaid credit is reduced first. Any paid portion is refunded to
              the selected account or the original payment account. Tracked lots
              are restored in their original expiry order. Verify the physical
              batch before posting.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="return-account">Refund account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger id="return-account">
                  <SelectValue placeholder="Use original payment account" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? [])
                    .filter((a) => a.isActive !== false)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {lines.map((line) => (
              <ReturnLineRow
                key={line.id}
                line={line}
                unitId={returnUnits[line.id!] ?? line.item?.unitId ?? "base"}
                onUnitChange={(unitId) => {
                  setReturnUnits((prev) => ({ ...prev, [line.id!]: unitId }));
                  setQtys((prev) => ({ ...prev, [line.id!]: "" }));
                }}
                value={qtys[line.id!] ?? ""}
                onChange={(v) =>
                  setQtys((prev) => ({ ...prev, [line.id!]: v }))
                }
              />
            ))}
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              Post return
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReturnLineRow({
  line,
  value,
  onChange,
  unitId,
  onUnitChange,
}: {
  line: SaleLine;
  unitId: string;
  onUnitChange: (unitId: string) => void;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1 rounded-lg border px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {line.item?.description ?? line.itemId}
        </p>
        <p className="text-xs text-muted-foreground">
          Sold {formatQty(line.quantity)}
          {line.item?.unit ? ` ${line.item.unit}` : ""}
        </p>
      </div>
      {line.unitSnapshot && line.unitSnapshot.unitId !== line.item?.unitId && (
        <Select value={unitId} onValueChange={onUnitChange}>
          <SelectTrigger aria-label="Return unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={line.item?.unitId ?? "base"}>
              {line.item?.unit ?? "Stock unit"}
            </SelectItem>
            <SelectItem value={line.unitSnapshot.unitId}>
              {line.unitSnapshot.symbol} (original factor{" "}
              {line.unitSnapshot.factor})
            </SelectItem>
          </SelectContent>
        </Select>
      )}
      <Input
        aria-label={`Return quantity for ${line.item?.description ?? line.itemId}`}
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        placeholder={`Return quantity in ${unitId === line.unitSnapshot?.unitId ? line.unitSnapshot.symbol : (line.item?.unit ?? "stock units")}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
