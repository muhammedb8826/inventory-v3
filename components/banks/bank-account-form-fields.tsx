"use client";

import { FormField } from "@/components/shared/page-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BankAccountFormValues } from "@/lib/bank-accounts";

export function BankAccountFormFields({
  values,
  onChange,
  mode,
}: {
  values: BankAccountFormValues;
  onChange: (patch: Partial<BankAccountFormValues>) => void;
  mode: "create" | "edit";
}) {
  return (
    <div className="grid gap-4">
      <FormField
        label="Display name"
        required
        htmlFor="bank-display-name"
        hint='Short label shown in dropdowns across purchases, sales, and expenses.'
      >
        <Input
          id="bank-display-name"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder='e.g. "Main Bank", "Cash"'
          required
          autoFocus
        />
      </FormField>
      {mode === "create" ? (
        <FormField label="Account type" required htmlFor="bank-account-type">
          <Select
            value={values.accountType}
            onValueChange={(v) =>
              onChange({ accountType: v as BankAccountFormValues["accountType"] })
            }
          >
            <SelectTrigger id="bank-account-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash till / petty cash</SelectItem>
              <SelectItem value="BANK">Bank account</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      ) : null}
      {values.accountType === "BANK" || mode === "edit" ? (
        <>
          <FormField label="Bank / provider" htmlFor="bank-institution">
            <Input
              id="bank-institution"
              value={values.bankName}
              onChange={(e) => onChange({ bankName: e.target.value })}
              placeholder="Commercial Bank of Ethiopia"
            />
          </FormField>
          <FormField label="Account holder name" htmlFor="bank-holder">
            <Input
              id="bank-holder"
              value={values.accountHolderName}
              onChange={(e) => onChange({ accountHolderName: e.target.value })}
              placeholder="Noble Store PLC"
            />
          </FormField>
          <FormField label="Account number" htmlFor="bank-number">
            <Input
              id="bank-number"
              value={values.accountNumber}
              onChange={(e) => onChange({ accountNumber: e.target.value })}
              placeholder="1000123456789"
            />
          </FormField>
        </>
      ) : null}
      {mode === "create" ? (
        <FormField label="Opening balance" htmlFor="bank-opening-balance">
          <Input
            id="bank-opening-balance"
            type="number"
            step="any"
            min="0"
            value={values.balance}
            onChange={(e) => onChange({ balance: e.target.value })}
            placeholder="0"
          />
        </FormField>
      ) : (
        <>
          <FormField label="Account type">
            <p className="text-sm text-muted-foreground">
              {values.accountType === "CASH"
                ? "Cash till / petty cash"
                : "Bank account"}
            </p>
          </FormField>
          <div className="flex items-center gap-2">
            <Switch
              id="bank-active"
              checked={values.isActive}
              onCheckedChange={(checked) => onChange({ isActive: checked })}
            />
            <Label htmlFor="bank-active">Active</Label>
          </div>
        </>
      )}
    </div>
  );
}
