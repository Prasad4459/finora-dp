import { FormDialog, type FieldDef } from "@/components/forms/form-dialog";
import {
  ACCOUNT_TYPES,
  ASSET_TYPES,
  BILL_CATEGORIES,
  BILL_ICON_KEYS,
  EXPENSE_CATEGORIES,
  GOAL_ICON_KEYS,
  INCOME_CATEGORIES,
  LIABILITY_TYPES,
  PAYMENT_METHODS,
} from "@/constants/finance";
import { todayISO } from "@/services/finance";
import { useFinance } from "@/store/finance-store";
import type { EntityKind } from "@/types/finance";

const todayDMY = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export function EntityDialogs({ open, onClose }: { open: EntityKind | null; onClose: () => void }) {
  const f = useFinance();
  const today = todayISO();

  const accountFields: FieldDef[] = [
    { key: "name", label: "Account name", type: "text", required: true },
    { key: "bank", label: "Bank / Provider", type: "text", required: true },
    { key: "type", label: "Account type", type: "select", options: ACCOUNT_TYPES as unknown as string[], required: true },
    { key: "balance", label: "Current balance (₹)", type: "number", required: true },
  ];

  const incomeFields: FieldDef[] = [
    { key: "source", label: "Source", type: "text", required: true },
    { key: "category", label: "Category", type: "select", options: INCOME_CATEGORIES as unknown as string[], required: true },
    { key: "account", label: "Account", type: "text", placeholder: "e.g. HDFC •• 4021" },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
    { key: "recurring", label: "Recurring", type: "switch" },
  ];

  const expenseFields: FieldDef[] = [
    { key: "merchant", label: "Merchant / Payee", type: "text", required: true },
    { key: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES as unknown as string[], required: true },
    { key: "account", label: "Account", type: "text", placeholder: "e.g. HDFC •• 4021" },
    { key: "method", label: "Payment method", type: "select", options: PAYMENT_METHODS as unknown as string[] },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  const assetFields: FieldDef[] = [
    { key: "name", label: "Asset name", type: "text", required: true },
    { key: "type", label: "Type", type: "select", options: ASSET_TYPES as unknown as string[], required: true },
    { key: "purchase", label: "Purchase value (₹)", type: "number", required: true },
    { key: "current", label: "Current value (₹)", type: "number", required: true },
    { key: "date", label: "Purchase date", type: "date", default: today },
  ];

  const liabilityFields: FieldDef[] = [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "type", label: "Type", type: "select", options: LIABILITY_TYPES as unknown as string[], required: true },
    { key: "balance", label: "Outstanding balance (₹)", type: "number", required: true },
    { key: "rate", label: "Interest rate (%)", type: "number" },
    { key: "emi", label: "EMI (₹)", type: "number" },
    { key: "due", label: "Next due date", type: "date", default: today },
  ];

  const goalFields: FieldDef[] = [
    { key: "name", label: "Goal name", type: "text", required: true },
    { key: "iconKey", label: "Icon", type: "select", options: GOAL_ICON_KEYS as unknown as string[], default: "PiggyBank" },
    { key: "target", label: "Target amount (₹)", type: "number", required: true },
    { key: "current", label: "Saved so far (₹)", type: "number", default: "0" },
    { key: "date", label: "Target date", type: "date", default: today },
  ];

  const budgetFields: FieldDef[] = [
    { key: "name", label: "Category", type: "text", required: true, placeholder: "e.g. Dining out" },
    { key: "budget", label: "Monthly budget (₹)", type: "number", required: true },
    { key: "spent", label: "Spent so far (₹)", type: "number", default: "0" },
  ];

  const billFields: FieldDef[] = [
    { key: "name", label: "Bill name", type: "text", required: true },
    { key: "category", label: "Category", type: "select", options: BILL_CATEGORIES as unknown as string[], required: true },
    { key: "iconKey", label: "Icon", type: "select", options: BILL_ICON_KEYS as unknown as string[], default: "Receipt" },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "due", label: "Due date (DD/MM/YYYY)", type: "text", default: todayDMY(), required: true },
  ];

  return (
    <>
      <FormDialog open={open === "account"} onClose={onClose} title="Add account" fields={accountFields}
        onSubmit={(v) => f.addAccount({ name: v.name, bank: v.bank, type: v.type, balance: Number(v.balance) })}
      />
      <FormDialog open={open === "income"} onClose={onClose} title="Add income" fields={incomeFields}
        onSubmit={(v) => f.addIncome({ source: v.source, category: v.category, account: v.account || "—", amount: Number(v.amount), date: v.date || today, recurring: !!v.recurring })}
      />
      <FormDialog open={open === "expense"} onClose={onClose} title="Add expense" fields={expenseFields}
        onSubmit={(v) => f.addExpense({ merchant: v.merchant, category: v.category, account: v.account || "—", method: v.method || "UPI", amount: Number(v.amount), date: v.date || today })}
      />
      <FormDialog open={open === "asset"} onClose={onClose} title="Add asset" fields={assetFields}
        onSubmit={(v) => f.addAsset({ name: v.name, type: v.type, purchase: Number(v.purchase), current: Number(v.current), date: v.date || today })}
      />
      <FormDialog open={open === "liability"} onClose={onClose} title="Add liability" fields={liabilityFields}
        onSubmit={(v) => f.addLiability({ name: v.name, type: v.type, balance: Number(v.balance), rate: Number(v.rate || 0), emi: Number(v.emi || 0), due: v.due || today })}
      />
      <FormDialog open={open === "goal"} onClose={onClose} title="Create goal" fields={goalFields}
        onSubmit={(v) => f.addGoal({ name: v.name, iconKey: v.iconKey || "PiggyBank", target: Number(v.target), current: Number(v.current || 0), date: v.date || today })}
      />
      <FormDialog open={open === "budget"} onClose={onClose} title="Set budget" fields={budgetFields}
        onSubmit={(v) => f.addBudget({ name: v.name, budget: Number(v.budget), spent: Number(v.spent || 0) })}
      />
      <FormDialog open={open === "bill"} onClose={onClose} title="Add bill" fields={billFields}
        onSubmit={(v) => f.addBill({ name: v.name, category: v.category, iconKey: v.iconKey || "Receipt", amount: Number(v.amount), due: v.due || todayDMY() })}
      />
    </>
  );
}