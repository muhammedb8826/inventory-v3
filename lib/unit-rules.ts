import type { UnitOfMeasure } from "@/lib/types";
const standard: Record<string, [string, number]> = {
  KG: ["MASS", 1],
  G: ["MASS", 0.001],
  MG: ["MASS", 0.000001],
  M: ["LENGTH", 1],
  CM: ["LENGTH", 0.01],
  MM: ["LENGTH", 0.001],
  M2: ["AREA", 1],
  CM2: ["AREA", 0.0001],
  L: ["VOLUME", 1],
  ML: ["VOLUME", 0.001],
  M3: ["VOLUME", 1000],
  H: ["TIME", 1],
  MIN: ["TIME", 1 / 60],
  PCS: ["COUNT", 1],
  DOZEN: ["COUNT", 12],
};
export function standardUnitFactor(
  from: UnitOfMeasure,
  to: UnitOfMeasure,
): number | undefined {
  const a = standard[from.code],
    b = standard[to.code];
  return a &&
    b &&
    a[0] === from.category &&
    b[0] === to.category &&
    from.category === to.category
    ? a[1] / b[1]
    : undefined;
}
export function allowedConversion(
  base: UnitOfMeasure,
  unit: UnitOfMeasure,
  kind = "CATEGORY",
) {
  return (
    unit.category === base.category ||
    (kind === "PACKAGING" &&
      unit.category === "COUNT" &&
      base.category !== "OTHER")
  );
}
export function fixedUnitFactor(
  unit: UnitOfMeasure,
  base: UnitOfMeasure,
  rows: { unitId: string; factor: string }[],
  units: UnitOfMeasure[],
) {
  const direct = standardUnitFactor(unit, base);
  if (direct !== undefined) return direct;
  for (const row of rows) {
    if (row.unitId === unit.id || !(Number(row.factor) > 0)) continue;
    const anchor = units.find((u) => u.id === row.unitId);
    const ratio = anchor && standardUnitFactor(unit, anchor);
    if (ratio !== undefined) return ratio * Number(row.factor);
  }
  return undefined;
}
export function validFrozenUnit(
  base: UnitOfMeasure,
  unit: UnitOfMeasure,
  factor: string,
  kind = "CATEGORY",
) {
  if (
    (standard[unit.code] && standard[unit.code][0] !== unit.category) ||
    (standard[base.code] && standard[base.code][0] !== base.category)
  )
    return false;
  if (!Number.isFinite(Number(factor)) || Number(factor) <= 0) return false;
  const fixed = standardUnitFactor(unit, base);
  return (
    allowedConversion(base, unit, kind) &&
    (fixed === undefined ||
      Math.abs(Number(factor) - fixed) <= Math.abs(fixed) * 1e-12)
  );
}
