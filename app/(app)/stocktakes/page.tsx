"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PermissionGate } from "@/components/permission-gate";
import { FrappeButtonPrimary } from "@/components/frappe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { errorMessage, formatDate } from "@/lib/format";
import type { Stocktake } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

function statusVariant(status: string) {
  if (status === "COMPLETED") return "outline" as const;
  if (status === "CANCELLED") return "secondary" as const;
  return "default" as const;
}

export default function StocktakesPage() {
  const { data: rows, loading, reload } = useFetch(
    () => api<Stocktake[]>("/stocktakes"),
    [],
  );

  return (
    <AppShell
      title="Stocktakes"
      actions={
        <PermissionGate permission="stocktake.write">
          <NewStocktakeDialog onSuccess={reload} />
        </PermissionGate>
      }
    >
      <PermissionGate permission="stocktake.read" showDenied>
        <DataCardTable
          storageKey="stocktakes-list"
          rows={rows ?? []}
          loading={loading}
          emptyTitle="No stocktakes"
          emptyDescription="Start a cycle count to snapshot system qty and record counts."
          columns={[
            {
              key: "location",
              header: "Location",
              cell: (r) => r.location?.name ?? "—",
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => (
                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
              ),
            },
            {
              key: "created",
              header: "Created",
              cell: (r) =>
                r.createdAt ? formatDate(r.createdAt) : "—",
            },
            {
              key: "by",
              header: "By",
              cell: (r) => r.createdBy?.fullName ?? "—",
            },
            {
              key: "actions",
              header: "",
              className: "w-24 text-right",
              cell: (r) => (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={`/stocktakes/${r.id}`}>Open</Link>
                </Button>
              ),
            },
          ]}
        />
      </PermissionGate>
    </AppShell>
  );
}

function NewStocktakeDialog({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: locations } = useLocations();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId) {
      toast.error("Select a location");
      return;
    }
    setSaving(true);
    try {
      const created = await api<Stocktake>("/stocktakes", {
        method: "POST",
        body: { locationId, notes: notes || undefined },
      });
      toast.success("Stocktake started");
      setOpen(false);
      onSuccess();
      router.push(`/stocktakes/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <FrappeButtonPrimary>
          <PlusIcon className="size-3.5" />
          New stocktake
        </FrappeButtonPrimary>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Start stocktake</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Location</Label>
              <Select value={locationId || undefined} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? [])
                    .filter((l) => l.type !== "BIN")
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button type="submit" disabled={saving || !locationId}>
              Start
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
