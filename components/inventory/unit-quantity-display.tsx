import { formatQty } from "@/lib/format";
import type { UnitSnapshot } from "@/lib/types";
export function UnitQuantityDisplay({
  quantity,
  unit,
  snapshot,
  commercial = false,
}: {
  quantity: string | number;
  unit?: string | null;
  snapshot?: UnitSnapshot | null;
  commercial?: boolean;
}) {
  const converted = snapshot && Number(snapshot.factor) !== 1;
  return (
    <div>
      <span>
        {formatQty(commercial ? (snapshot?.quantity ?? quantity) : quantity)}{" "}
        {commercial ? (snapshot?.symbol ?? unit) : unit}
      </span>
      {converted && (
        <span className="block text-xs text-muted-foreground">
          {commercial
            ? `${formatQty(quantity)} ${unit ?? ""} stock`
            : `Entered ${formatQty(snapshot.quantity)} ${snapshot.symbol}`}
        </span>
      )}
      {snapshot?.dimensions && (
        <span className="block text-xs text-muted-foreground">
          {snapshot.dimensions.widthMetres} m x{" "}
          {snapshot.dimensions.lengthMetres} m x {snapshot.dimensions.count}
        </span>
      )}
    </div>
  );
}
