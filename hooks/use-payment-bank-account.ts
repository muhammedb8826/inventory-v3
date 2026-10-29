"use client";

import { useEffect } from "react";
import { needsBankAccount } from "@/lib/document-utils";
import {
  accountsForPaymentMethod,
  resolveBankAccountId,
} from "@/lib/bank-accounts";
import type { BankAccount, PaymentMethod } from "@/lib/types";

/** Auto-select when exactly one matching CASH/BANK account exists. */
export function useAutoPaymentAccount(
  paymentMethod: PaymentMethod,
  accounts: BankAccount[] | null | undefined,
  bankAccountId: string,
  setBankAccountId: (id: string) => void
) {
  useEffect(() => {
    if (!needsBankAccount(paymentMethod) || !accounts?.length) return;
    const matching = accountsForPaymentMethod(
      paymentMethod,
      accounts,
      bankAccountId
    );
    if (matching.length !== 1) return;
    const resolved = matching[0].id;
    if (bankAccountId !== resolved) {
      setBankAccountId(resolved);
    }
  }, [accounts, paymentMethod, bankAccountId, setBankAccountId]);
}

export function onPaymentMethodChange(
  method: PaymentMethod,
  setPaymentMethod: (m: PaymentMethod) => void,
  setBankAccountId: (id: string) => void
) {
  setPaymentMethod(method);
  setBankAccountId("");
}

export function bankAccountValidationError(
  method: PaymentMethod,
  accounts: BankAccount[] | null | undefined,
  resolvedId: string | undefined
): string | null {
  if (!needsBankAccount(method)) return null;
  if (resolvedId) return null;
  const matching = accountsForPaymentMethod(method, accounts);
  if (method === "CASH") {
    if (matching.length === 0) {
      return "No cash till found. Create one with type CASH (New account on this form, or Bank settings).";
    }
    return "Select a cash till";
  }
  if (method === "BANK") {
    if (matching.length === 0) {
      return "No bank account found. Create one with type BANK (New account on this form, or Bank settings).";
    }
    return "Select a bank account for the transfer";
  }
  return null;
}
