"use client";
import { createContext, useContext, type AriaAttributes } from "react";
export type FieldValue = {
  id: string;
  labelId: string;
  descriptionId?: string;
  invalid: boolean;
  required?: boolean;
};
export const FormFieldContext = createContext<FieldValue | null>(null);
type ControlProps = AriaAttributes & { id?: string };
export function useFormControl<T extends ControlProps>(props: T): T {
  const field = useContext(FormFieldContext);
  if (!field) return props;
  return {
    ...props,
    id: props.id ?? field.id,
    "aria-labelledby":
      props["aria-labelledby"] ??
      (props["aria-label"] ? undefined : field.labelId),
    "aria-describedby":
      [props["aria-describedby"], field.descriptionId]
        .filter(Boolean)
        .join(" ") || undefined,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
    "aria-required": props["aria-required"] ?? (field.required || undefined),
  };
}
