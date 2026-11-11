import type { UnitOfMeasure, UnitGroup } from "@/lib/types";

/** Usable/default width applies only to length-based stock (rolls, reels, film, etc.). */
export function supportsUsableWidth(
  category: UnitOfMeasure["category"] | string | null | undefined,
) {
  return category === "LENGTH";
}

export function resolveStockCategory(opts: {
  unitId?: string | null;
  groupId?: string | null;
  units?: UnitOfMeasure[] | null;
  groups?: UnitGroup[] | null;
  fallbackCategory?: UnitOfMeasure["category"] | null;
}) {
  const group = opts.groups?.find((g) => g.id === opts.groupId);
  if (group?.category) return group.category;
  const unit = opts.units?.find((u) => u.id === opts.unitId);
  return unit?.category ?? opts.fallbackCategory ?? null;
}
