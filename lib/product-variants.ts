import type { Item, ItemType, UnitGroup, UnitOfMeasure } from "./types";
import type { RecordMetadata } from "@/components/shared/record-metadata";

export interface ProductAttribute extends RecordMetadata {
  id: string;
  name: string;
  values: string[];
  isActive: boolean;
}
export interface FamilyAttribute {
  attributeId: string;
  values: string[];
}
export interface VariantValue {
  attributeId: string;
  name: string;
  value: string;
}
export interface ProductVariant extends Item {
  isActive: boolean;
  variantValues: VariantValue[];
  stocks: {
    id: string;
    locationId: string;
    locationName?: string;
    quantity: string;
    purchasePrice: string;
  }[];
}
export interface ProductFamily extends RecordMetadata {
  id: string;
  name: string;
  description: string;
  itemType: ItemType;
  unitId: string;
  stockUnit: UnitOfMeasure;
  unitGroupId: string | null;
  unitGroup: UnitGroup | null;
  attributes: FamilyAttribute[];
  isActive: boolean;
  variantCount?: number;
  variants?: ProductVariant[];
}
export type VariantSelection = { attributeId: string; value: string }[];
export function combinationKey(values: VariantSelection) {
  return JSON.stringify(
    values
      .map((v) => [v.attributeId, v.value])
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
}
/** Bound the preview before allocating a Cartesian product. */
export function previewCombinations(
  attributes: FamilyAttribute[],
  limit = 100,
): VariantSelection[] | null {
  if (!attributes.length || attributes.some((a) => !a.values.length)) return [];
  if (attributes.reduce((n, a) => n * a.values.length, 1) > limit) return null;
  return attributes.reduce<VariantSelection[]>(
    (rows, a) =>
      rows.flatMap((row) =>
        a.values.map((value) => [
          ...row,
          { attributeId: a.attributeId, value },
        ]),
      ),
    [[]],
  );
}
