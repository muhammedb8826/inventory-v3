"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FormSummary,
  FormField,
  FormGrid,
  PageForm,
  PageFormActions,
  PageFormCancel,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { QuickExpenseCategoryDialog } from "@/components/expenses/quick-expense-category-dialog";
import { QuickBankAccountDialog } from "@/components/banks/quick-bank-account-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { bankAccountSelectOptions } from "@/lib/bank-accounts";
import { errorMessage, formatMoney } from "@/lib/format";
import type { BankAccount, ExpenseCategory } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";

export function ExpenseForm() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);

  const {
    data: categories,
    reload: reloadCategories,
    setData: setCategories,
  } = useFetch(() => api<ExpenseCategory[]>("/expenses/categories"), []);
  const {
    data: banks,
    reload: reloadBanks,
    setData: setBanks,
  } = useFetch(() => apiList<BankAccount>("/banks/accounts"), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/expenses", {
        method: "POST",
        body: {
          categoryId,
          bankAccountId,
          amount: parseFloat(amount),
          description,
          expenseDate,
        },
      });
      toast.success("Expense recorded");
      router.push("/expenses");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageForm
      onSubmit={handleSubmit}
      aside={
        <FormSummary
          rows={[
            {
              label: "Category",
              value: categories?.find((c) => c.id === categoryId)?.name,
            },
            {
              label: "Payment account",
              value: banks?.find((b) => b.id === bankAccountId)?.name,
            },
            { label: "Expense date", value: expenseDate },
            { label: "Amount", value: amount ? formatMoney(amount) : null },
          ]}
          note="This expense will be recorded against the selected payment account."
        />
      }
    >
      <PageFormCard>
        <PageFormSection
          title="Expense"
          description="Record an outflow against a category and payment account."
        >
          <FormGrid>
            <EntitySelectField
              label="Category"
              required
              value={categoryId}
              onValueChange={setCategoryId}
              options={(categories ?? []).map((c) => ({
                id: c.id,
                label: c.name,
              }))}
              listHref="/expenses"
              listLabel="Manage categories"
              emptyMessage="Create an expense category first."
              quickCreate={
                <QuickExpenseCategoryDialog
                  onCreated={(category) => {
                    setCategories((prev) => [...(prev ?? []), category]);
                    setCategoryId(category.id);
                    reloadCategories();
                  }}
                />
              }
            />
            <EntitySelectField
              label="Bank account"
              required
              value={bankAccountId}
              onValueChange={setBankAccountId}
              options={bankAccountSelectOptions(banks ?? [], bankAccountId)}
              listHref="/banks"
              listLabel="All accounts"
              emptyMessage="Create a bank account to pay from."
              quickCreate={
                <QuickBankAccountDialog
                  onCreated={(account) => {
                    setBanks((prev) => [...(prev ?? []), account]);
                    setBankAccountId(account.id);
                    reloadBanks();
                  }}
                />
              }
            />
            <FormField label="Amount" required>
              <Input
                className="h-10"
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Date" required>
              <Input
                className="h-10"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <Input
                className="h-10"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
              />
            </FormField>
          </FormGrid>
        </PageFormSection>
      </PageFormCard>

      <PageFormActions>
        <PageFormCancel href="/expenses" />
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? <Spinner className="size-4" /> : "Save"}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
