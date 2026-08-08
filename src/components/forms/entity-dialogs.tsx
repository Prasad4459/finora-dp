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
import { useFinance, type EditTarget } from "@/store/finance-store";
import type { EntityKind } from "@/types/finance";

const todayDMY = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

type Values = Record<string, string | boolean>;

/** Maps an entity being edited back onto the dialog field keys. */
function initialFor(editing: EditTarget | null): Values | null {
  if (!editing) return null;
  const e = editing.entity as Record<string, unknown>;
  const str = (k: string) => (e[k] === undefined || e[k] === null ? "" : String(e[k]));
  switch (editing.kind) {
    case "account":
      return { name: str("name"), bank: str("bank"), type: str("type"), balance: str("balance") };
    case "income":
      return { source: str("source"), category: str("category"), account: str("account"), amount: str("amount"), date: str("date"), recurring: Boolean(e.recurring) };
    case "expense":
      return { merchant: str("merchant"), category: str("category"), account: str("account"), method: str("method"), amount: str("amount"), date: str("date") };
    case "asset":
      return { name: str("name"), type: str("type"), purchase: str("purchase"), current: str("current"), date: str("date") };
    case "liability":
      return { name: str("name"), type: str("type"), balance: str("balance"), rate: str("rate"), emi: str("emi"), due: str("due") };
    case "goal":
      return { name: str("name"), target: str("target"), current: str("current"), date: str("date") };
    case "budget":
      return { name: str("name"), budget: str("budget"), spent: str("spent") };
    case "bill":
      return { name: str("name"), category: str("category"), amount: str("amount"), due: str("due") };
  }
}

export function EntityDialogs({
  open,
  editing = null,
  onClose,
}: {
  open: EntityKind | null;
  editing?: EditTarget | null;
  onClose: () => void;
}) {
  const f = useFinance();
  const accountNames = f.accounts.map((a) => a.name);
  const assetNames = f.assets.map((a) => a.name);
  const liabilityNames = f.liabilities.map((l) => l.name);
  const goalNames = f.goals.map((g) => g.name);
  const today = todayISO();
  const initial = initialFor(editing);
  const editId = editing?.entity.id ?? null;
  const isEdit = (kind: EntityKind) => editing?.kind === kind && !!editId;
  const common = (kind: EntityKind) => ({
    initialValues: editing?.kind === kind ? initial : null,
    submitLabel: isEdit(kind) ? "Save changes" : "Save",
  });

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

  const transferFields: FieldDef[] = [
    { key: "from", label: "From account", type: "select", options: accountNames, required: true },
    { key: "to", label: "To account", type: "select", options: accountNames, required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional" },
  ];

  const investmentFields: FieldDef[] = [
    { key: "asset", label: "Invest into (asset)", type: "select", options: assetNames, required: true },
    { key: "account", label: "Paid from account", type: "select", options: accountNames, required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional" },
  ];

  const dividendFields: FieldDef[] = [
    { key: "source", label: "Source", type: "text", required: true, placeholder: "e.g. TCS Dividend" },
    { key: "account", label: "Credited to account", type: "select", options: accountNames, required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  const refundFields: FieldDef[] = [
    { key: "merchant", label: "Refunded by", type: "text", required: true },
    { key: "category", label: "Original category", type: "select", options: EXPENSE_CATEGORIES as unknown as string[] },
    { key: "account", label: "Credited to account", type: "select", options: accountNames, required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  const emiFields: FieldDef[] = [
    { key: "liability", label: "Loan / liability", type: "select", options: liabilityNames, required: true },
    { key: "account", label: "Paid from account", type: "select", options: accountNames, required: true },
    { key: "amount", label: "EMI amount (₹)", type: "number", required: true },
    { key: "principal", label: "Principal portion (₹)", type: "number" },
    { key: "interest", label: "Interest portion (₹)", type: "number" },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  const contributionFields: FieldDef[] = [
    { key: "goal", label: "Goal", type: "select", options: goalNames, required: true },
    { key: "account", label: "Paid from account", type: "select", options: accountNames, required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  return (
    <>
      <FormDialog open={open === "account"} onClose={onClose} title={isEdit("account") ? "Edit account" : "Add account"} fields={accountFields} {...common("account")}
        onSubmit={(v) => {
          const payload = { name: v.name, bank: v.bank, type: v.type, balance: Number(v.balance) };
          isEdit("account") ? f.updateAccount(editId!, payload) : f.addAccount(payload);
        }}
      />
      <FormDialog open={open === "income"} onClose={onClose} title={isEdit("income") ? "Edit income" : "Add income"} fields={incomeFields} {...common("income")}
        onSubmit={(v) => {
          const payload = { source: v.source, category: v.category, account: v.account || "—", amount: Number(v.amount), date: v.date || today, recurring: !!v.recurring };
          isEdit("income") ? f.updateIncome(editId!, payload) : f.addIncome(payload);
        }}
      />
      <FormDialog open={open === "expense"} onClose={onClose} title={isEdit("expense") ? "Edit expense" : "Add expense"} fields={expenseFields} {...common("expense")}
        onSubmit={(v) => {
          const payload = { merchant: v.merchant, category: v.category, account: v.account || "—", method: v.method || "UPI", amount: Number(v.amount), date: v.date || today };
          isEdit("expense") ? f.updateExpense(editId!, payload) : f.addExpense(payload);
        }}
      />
      <FormDialog open={open === "asset"} onClose={onClose} title={isEdit("asset") ? "Edit asset" : "Add asset"} fields={assetFields} {...common("asset")}
        onSubmit={(v) => {
          const payload = { name: v.name, type: v.type, purchase: Number(v.purchase), current: Number(v.current), date: v.date || today };
          isEdit("asset") ? f.updateAsset(editId!, payload) : f.addAsset(payload);
        }}
      />
      <FormDialog open={open === "liability"} onClose={onClose} title={isEdit("liability") ? "Edit liability" : "Add liability"} fields={liabilityFields} {...common("liability")}
        onSubmit={(v) => {
          const payload = { name: v.name, type: v.type, balance: Number(v.balance), rate: Number(v.rate || 0), emi: Number(v.emi || 0), due: v.due || today };
          isEdit("liability") ? f.updateLiability(editId!, payload) : f.addLiability(payload);
        }}
      />
      <FormDialog open={open === "goal"} onClose={onClose} title={isEdit("goal") ? "Edit goal" : "Create goal"} fields={goalFields} {...common("goal")}
        onSubmit={(v) => {
          const payload = { name: v.name, iconKey: v.iconKey || "PiggyBank", target: Number(v.target), current: Number(v.current || 0), date: v.date || today };
          isEdit("goal") ? f.updateGoal(editId!, payload) : f.addGoal(payload);
        }}
      />
      <FormDialog open={open === "budget"} onClose={onClose} title={isEdit("budget") ? "Edit budget" : "Set budget"} fields={budgetFields} {...common("budget")}
        onSubmit={(v) => {
          const payload = { name: v.name, budget: Number(v.budget), spent: Number(v.spent || 0) };
          isEdit("budget") ? f.updateBudget(editId!, payload) : f.addBudget(payload);
        }}
      />
      <FormDialog open={open === "bill"} onClose={onClose} title={isEdit("bill") ? "Edit bill" : "Add bill"} fields={billFields} {...common("bill")}
        onSubmit={(v) => {
          const payload = { name: v.name, category: v.category, iconKey: v.iconKey || "Receipt", amount: Number(v.amount), due: v.due || todayDMY() };
          isEdit("bill") ? f.updateBill(editId!, payload) : f.addBill(payload);
        }}
      />
      <FormDialog open={open === "transfer"} onClose={onClose} title="Transfer between accounts" fields={transferFields}
        onSubmit={(v) => f.addTransfer({ from: v.from, to: v.to, amount: Number(v.amount), date: v.date || today, notes: v.notes })}
      />
      <FormDialog open={open === "investment"} onClose={onClose} title="Record investment" fields={investmentFields}
        onSubmit={(v) => f.addInvestment({ asset: v.asset, account: v.account, amount: Number(v.amount), date: v.date || today, notes: v.notes })}
      />
      <FormDialog open={open === "dividend"} onClose={onClose} title="Record dividend" fields={dividendFields}
        onSubmit={(v) => f.addDividend({ source: v.source, account: v.account, amount: Number(v.amount), date: v.date || today })}
      />
      <FormDialog open={open === "refund"} onClose={onClose} title="Record refund" fields={refundFields}
        onSubmit={(v) => f.addRefund({ merchant: v.merchant, category: v.category, account: v.account, amount: Number(v.amount), date: v.date || today })}
      />
      <FormDialog open={open === "emi"} onClose={onClose} title="Record EMI payment" fields={emiFields}
        onSubmit={(v) => f.addEmiPayment({ liability: v.liability, account: v.account, amount: Number(v.amount), principal: Number(v.principal || 0), interest: Number(v.interest || 0), date: v.date || today })}
      />
      <FormDialog open={open === "contribution"} onClose={onClose} title="Add to goal" fields={contributionFields}
        onSubmit={(v) => f.addGoalContribution({ goal: v.goal, account: v.account, amount: Number(v.amount), date: v.date || today })}
      />
    </>
  );
}