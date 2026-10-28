"use client";

import { useMemo, useState } from "react";
import { MasterDataPage } from "@/components/master-data/master-data-page";
import {
  FilterField,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Location, LocationType } from "@/lib/types";
import { useLocations } from "@/hooks/use-locations";

const ALL_TYPES = "__all__";

export default function LocationsPage() {
  const [type, setType] = useState<string>(ALL_TYPES);
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data: allLocations } = useLocations({ includeInactive: true });

  const parentOptions = useMemo(
    () =>
      (allLocations ?? [])
        .filter((l) => l.type !== "BIN" && l.isActive !== false)
        .map((l) => ({ value: l.id, label: `${l.name} (${l.type})` })),
    [allLocations],
  );

  const activeFilterCount = useMemo(
    () =>
      countActiveFilters([
        type !== ALL_TYPES ? type : "",
        includeInactive,
      ]),
    [type, includeInactive],
  );

  return (
    <MasterDataPage<Location>
      title="Locations"
      endpoint="/locations"
      readPermission="locations.read"
      writePermission="locations.write"
      emptyDescription="Create warehouse, showroom, and bin locations."
      listParams={{
        type: type === ALL_TYPES ? undefined : (type as LocationType),
        includeInactive: includeInactive || undefined,
      }}
      filterActiveCount={activeFilterCount}
      onResetFilters={() => {
        setType(ALL_TYPES);
        setIncludeInactive(false);
      }}
      filterExtras={
        <>
          <FilterField label="Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>All types</SelectItem>
                <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                <SelectItem value="SHOWROOM">Showroom</SelectItem>
                <SelectItem value="BIN">Bin</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3">
            <Label
              htmlFor="locations-include-inactive"
              className="text-sm font-medium"
            >
              Include inactive
            </Label>
            <Switch
              id="locations-include-inactive"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
          </div>
        </>
      }
      fields={[
        { name: "name", label: "Name", required: true },
        {
          name: "type",
          label: "Type",
          type: "select",
          required: true,
          options: [
            { value: "WAREHOUSE", label: "Warehouse" },
            { value: "SHOWROOM", label: "Showroom" },
            { value: "BIN", label: "Bin" },
          ],
        },
        { name: "address", label: "Address", type: "textarea" },
        {
          name: "parentId",
          label: "Parent (required for Bin)",
          type: "select",
          options: parentOptions,
        },
      ]}
      columns={[
        { key: "name", header: "Name", cell: (r) => r.name },
        {
          key: "type",
          header: "Type",
          cell: (r) => <Badge variant="outline">{r.type}</Badge>,
        },
        {
          key: "parent",
          header: "Parent",
          cell: (r) =>
            r.parent?.name ?? (r.parentId ? r.parentId.slice(0, 8) : "—"),
        },
        {
          key: "address",
          header: "Address",
          cell: (r) => r.address ?? "—",
        },
        {
          key: "status",
          header: "Status",
          cell: (r) => (
            <Badge variant={r.isActive === false ? "secondary" : "outline"}>
              {r.isActive === false ? "Inactive" : "Active"}
            </Badge>
          ),
        },
      ]}
      supportsActive
    />
  );
}
