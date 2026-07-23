import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Home, Zap, Wifi, CreditCard, Smartphone, ShieldCheck, Tv, Receipt, Landmark, Wallet, Banknote, TrendingUp, Plane, GraduationCap, Car, PiggyBank, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// ---------- Types ----------
export type Account = { id: number; name: string; bank: string; type: string; balance: number; icon: LucideIcon; color: string; updated: string };
export type Income = { id: number; date: string; source: string; category: string; account: string; amount: number; recurring: boolean };
export type Expense = { id: number; date: string; merchant: string; category: string; account: string; method: string; amount: number };
export type Asset = { id: number; name: string; type: string; purchase: number; current: number; date: string };
export type Liability = { id: number; name: string; type: string; balance: number; rate: number; emi: number; due: string; remaining: number; status: string };
export type Goal = { id: number; name: string; icon: LucideIcon; target: number; current: number; date: string };
export type Budget = { name: string; spent: number; budget: number };
export type Bill = { id: number; name: string; category: string; due: string; amount: number; icon: LucideIcon; status: string };

export type EntityKind = "account" | "income" | "expense" | "asset" | "liability" | "goal" | "budget" | "bill";

// ---------- Seed data ----------
const seedAccounts: Account[] = [
  { id: 1, name: "Salary Account", bank: "HDFC Bank", type: "Savings", balance: 142500, icon: Landmark, color: "bg-blue-500/10 text-blue-600", updated: "2026-07-02" },
  { id: 2, name: "Joint Savings", bank: "SBI", type: "Savings", balance: 68200, icon: Landmark, color: "bg-emerald-500/10 text-emerald-600", updated: "2026-07-01" },
  { id: 3, name: "Everyday Spending", bank: "ICICI Bank", type: "Current", balance: 21400, icon: Wallet, color: "bg-orange-500/10 text-orange-600", updated: "2026-07-02" },
  { id: 4, name: "GPay Wallet", bank: "Google Pay", type: "UPI Wallet", balance: 3800, icon: Smartphone, color: "bg-fuchsia-500/10 text-fuchsia-600", updated: "2026-07-02" },
  { id: 5, name: "Cash on hand", bank: "—", type: "Cash", balance: 9200, icon: Banknote, color: "bg-amber-500/10 text-amber-600", updated: "2026-06-30" },
  { id: 6, name: "Amazon Pay ICICI CC", bank: "ICICI Bank", type: "Credit Card", balance: -12500, icon: CreditCard, color: "bg-rose-500/10 text-rose-600", updated: "2026-07-02" },
  { id: 7, name: "Zerodha", bank: "Zerodha", type: "Investment Account", balance: 484000, icon: TrendingUp, color: "bg-violet-500/10 text-violet-600", updated: "2026-07-01" },
];

const seedIncomes: Income[] = [
  { id: 1, date: "2026-07-01", source: "Infosys Ltd.", category: "Salary", account: "HDFC •• 4021", amount: 85000, recurring: true },
  { id: 2, date: "2026-06-28", source: "Freelance — Acme Co.", category: "Freelancing", account: "ICICI •• 1009", amount: 22000, recurring: false },
  { id: 3, date: "2026-06-20", source: "SBI Savings Interest", category: "Interest", account: "SBI •• 8891", amount: 1240, recurring: true },
  { id: 4, date: "2026-06-15", source: "TCS Dividend", category: "Dividend", account: "Zerodha", amount: 3600, recurring: false },
  { id: 5, date: "2026-06-10", source: "Amazon Cashback", category: "Cashback", account: "HDFC •• 4021", amount: 450, recurring: false },
  { id: 6, date: "2026-06-05", source: "PG rent — Koramangala", category: "Rental Income", account: "Axis •• 3320", amount: 18000, recurring: true },
  { id: 7, date: "2026-06-01", source: "Infosys Ltd.", category: "Salary", account: "HDFC •• 4021", amount: 85000, recurring: true },
];

const seedExpenses: Expense[] = [
  { id: 1, date: "2026-07-02", merchant: "BigBasket", category: "Groceries", account: "HDFC •• 4021", method: "UPI", amount: 2450 },
  { id: 2, date: "2026-07-01", merchant: "House Rent — Landlord", category: "Rent", account: "SBI •• 8891", method: "Bank transfer", amount: 18000 },
  { id: 3, date: "2026-06-30", merchant: "Ola Cabs", category: "Travel", account: "ICICI •• 1009", method: "UPI", amount: 320 },
  { id: 4, date: "2026-06-29", merchant: "Netflix", category: "Entertainment", account: "HDFC •• 4021", method: "Card", amount: 649 },
  { id: 5, date: "2026-06-29", merchant: "Swiggy", category: "Food", account: "Axis •• 3320", method: "UPI", amount: 540 },
  { id: 6, date: "2026-06-28", merchant: "Apollo Pharmacy", category: "Medical", account: "HDFC •• 4021", method: "UPI", amount: 820 },
  { id: 7, date: "2026-06-27", merchant: "Indian Oil", category: "Fuel", account: "ICICI •• 1009", method: "Card", amount: 2200 },
  { id: 8, date: "2026-06-25", merchant: "Myntra", category: "Shopping", account: "HDFC •• 4021", method: "Card", amount: 3200 },
];

const seedAssets: Asset[] = [
  { id: 1, name: "SBI Savings", type: "Bank", purchase: 200000, current: 200000, date: "2022-04-01" },
  { id: 2, name: "HDFC 1-Year FD", type: "FD", purchase: 300000, current: 321000, date: "2025-07-10" },
  { id: 3, name: "Sovereign Gold Bond", type: "Gold", purchase: 150000, current: 187000, date: "2023-09-15" },
  { id: 4, name: "Nifty 50 Index Fund", type: "Mutual Funds", purchase: 400000, current: 512000, date: "2022-06-20" },
  { id: 5, name: "TCS Shares", type: "Stocks", purchase: 120000, current: 148000, date: "2024-02-11" },
  { id: 6, name: "PPF Account", type: "PPF", purchase: 250000, current: 278000, date: "2020-04-01" },
  { id: 7, name: "EPF", type: "EPF", purchase: 320000, current: 356000, date: "2021-05-01" },
  { id: 8, name: "NPS Tier-1", type: "NPS", purchase: 80000, current: 92000, date: "2023-04-01" },
  { id: 9, name: "2BHK — Whitefield", type: "Property", purchase: 6500000, current: 7800000, date: "2019-11-20" },
  { id: 10, name: "Honda City", type: "Vehicle", purchase: 1200000, current: 780000, date: "2021-01-15" },
  { id: 11, name: "Bitcoin", type: "Crypto", purchase: 50000, current: 72000, date: "2024-08-01" },
];

const seedLiabilities: Liability[] = [
  { id: 1, name: "SBI Home Loan", type: "Home Loan", balance: 3850000, rate: 8.5, emi: 32500, due: "2026-08-01", remaining: 168, status: "Active" },
  { id: 2, name: "HDFC Car Loan", type: "Car Loan", balance: 420000, rate: 9.2, emi: 12800, due: "2026-07-15", remaining: 36, status: "Active" },
  { id: 3, name: "Axis Education Loan", type: "Education Loan", balance: 180000, rate: 10.5, emi: 8500, due: "2026-07-20", remaining: 24, status: "Active" },
  { id: 4, name: "Personal Loan — Bajaj", type: "Personal Loan", balance: 90000, rate: 13.0, emi: 7500, due: "2026-07-10", remaining: 14, status: "Active" },
  { id: 5, name: "HDFC Credit Card", type: "Credit Card", balance: 12500, rate: 36.0, emi: 0, due: "2026-07-15", remaining: 1, status: "Due" },
  { id: 6, name: "Loan from Dad", type: "Borrowed Money", balance: 50000, rate: 0, emi: 5000, due: "2026-07-30", remaining: 10, status: "Active" },
];

const goalIconMap: Record<string, LucideIcon> = { PiggyBank, Plane, Home, Car, GraduationCap, Target: Receipt };
const seedGoals: Goal[] = [
  { id: 1, name: "Emergency Fund", icon: PiggyBank, target: 600000, current: 425000, date: "2027-03-31" },
  { id: 2, name: "Europe Trip", icon: Plane, target: 350000, current: 128000, date: "2026-12-15" },
  { id: 3, name: "Home Down Payment", icon: Home, target: 2500000, current: 850000, date: "2028-06-01" },
  { id: 4, name: "New Car (Creta)", icon: Car, target: 1500000, current: 420000, date: "2027-09-20" },
  { id: 5, name: "MBA Fund", icon: GraduationCap, target: 1800000, current: 260000, date: "2028-07-01" },
];

const seedBudgets: Budget[] = [
  { name: "Groceries", spent: 8500, budget: 10000 },
  { name: "Rent", spent: 18000, budget: 18000 },
  { name: "Fuel", spent: 4200, budget: 4000 },
  { name: "Food & Dining", spent: 5600, budget: 5000 },
  { name: "Entertainment", spent: 2800, budget: 3500 },
  { name: "Shopping", spent: 3200, budget: 5000 },
  { name: "Utilities", spent: 3800, budget: 4500 },
  { name: "Transport", spent: 1900, budget: 3000 },
];

const billIconMap: Record<string, LucideIcon> = { Home, Zap, Wifi, CreditCard, Smartphone, ShieldCheck, Tv, Receipt };
const seedBills: Bill[] = [
  { id: 1, name: "House Rent", category: "Rent", due: "05/07/2026", amount: 18000, icon: Home, status: "Upcoming" },
  { id: 2, name: "BESCOM Electricity", category: "Utilities", due: "08/07/2026", amount: 2450, icon: Zap, status: "Upcoming" },
  { id: 3, name: "Jio Fiber", category: "Internet", due: "12/07/2026", amount: 999, icon: Wifi, status: "Upcoming" },
  { id: 4, name: "HDFC Credit Card", category: "Credit Card", due: "15/07/2026", amount: 12500, icon: CreditCard, status: "Upcoming" },
  { id: 5, name: "Airtel Postpaid", category: "Mobile", due: "18/07/2026", amount: 599, icon: Smartphone, status: "Upcoming" },
  { id: 6, name: "HDFC ERGO Health", category: "Insurance", due: "22/07/2026", amount: 14500, icon: ShieldCheck, status: "Upcoming" },
  { id: 7, name: "Netflix + Prime", category: "Subscriptions", due: "25/07/2026", amount: 1148, icon: Tv, status: "Upcoming" },
  { id: 8, name: "SBI Home Loan EMI", category: "EMI", due: "01/08/2026", amount: 32500, icon: Home, status: "Scheduled" },
];

// ---------- Context ----------
type Ctx = {
  accounts: Account[]; addAccount: (v: Omit<Account, "id" | "icon" | "color" | "updated">) => void; removeAccount: (id: number) => void;
  incomes: Income[]; addIncome: (v: Omit<Income, "id">) => void; removeIncome: (id: number) => void;
  expenses: Expense[]; addExpense: (v: Omit<Expense, "id">) => void; removeExpense: (id: number) => void;
  assets: Asset[]; addAsset: (v: Omit<Asset, "id">) => void; removeAsset: (id: number) => void;
  liabilities: Liability[]; addLiability: (v: Omit<Liability, "id" | "remaining" | "status">) => void; removeLiability: (id: number) => void;
  goals: Goal[]; addGoal: (v: { name: string; iconKey: string; target: number; current: number; date: string }) => void; removeGoal: (id: number) => void;
  budgets: Budget[]; addBudget: (v: Budget) => void; removeBudget: (name: string) => void;
  bills: Bill[]; addBill: (v: { name: string; category: string; due: string; amount: number; iconKey: string }) => void; removeBill: (id: number) => void;
  openDialog: (k: EntityKind) => void;
};

const FinanceCtx = createContext<Ctx | null>(null);
export function useFinance() {
  const v = useContext(FinanceCtx);
  if (!v) throw new Error("useFinance must be used within FinanceProvider");
  return v;
}

const typeIconMap: Record<string, { icon: LucideIcon; color: string }> = {
  Savings: { icon: Landmark, color: "bg-blue-500/10 text-blue-600" },
  Current: { icon: Wallet, color: "bg-orange-500/10 text-orange-600" },
  Cash: { icon: Banknote, color: "bg-amber-500/10 text-amber-600" },
  "UPI Wallet": { icon: Smartphone, color: "bg-fuchsia-500/10 text-fuchsia-600" },
  "Credit Card": { icon: CreditCard, color: "bg-rose-500/10 text-rose-600" },
  "Investment Account": { icon: TrendingUp, color: "bg-violet-500/10 text-violet-600" },
  "Loan Account": { icon: CreditCard, color: "bg-rose-500/10 text-rose-600" },
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState(seedAccounts);
  const [incomes, setIncomes] = useState(seedIncomes);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [assets, setAssets] = useState(seedAssets);
  const [liabilities, setLiabilities] = useState(seedLiabilities);
  const [goals, setGoals] = useState(seedGoals);
  const [budgets, setBudgets] = useState(seedBudgets);
  const [bills, setBills] = useState(seedBills);
  const [dialog, setDialog] = useState<EntityKind | null>(null);
  const nextId = (arr: { id: number }[]) => (arr.length ? Math.max(...arr.map((a) => a.id)) + 1 : 1);

  const value: Ctx = useMemo(
    () => ({
      accounts, incomes, expenses, assets, liabilities, goals, budgets, bills,
      addAccount: (v) => {
        const meta = typeIconMap[v.type] ?? { icon: Wallet, color: "bg-muted text-foreground" };
        setAccounts((s) => [{ id: nextId(s), ...v, icon: meta.icon, color: meta.color, updated: new Date().toISOString().slice(0, 10) }, ...s]);
      },
      removeAccount: (id) => setAccounts((s) => s.filter((x) => x.id !== id)),
      addIncome: (v) => setIncomes((s) => [{ id: nextId(s), ...v }, ...s]),
      removeIncome: (id) => setIncomes((s) => s.filter((x) => x.id !== id)),
      addExpense: (v) => setExpenses((s) => [{ id: nextId(s), ...v }, ...s]),
      removeExpense: (id) => setExpenses((s) => s.filter((x) => x.id !== id)),
      addAsset: (v) => setAssets((s) => [{ id: nextId(s), ...v }, ...s]),
      removeAsset: (id) => setAssets((s) => s.filter((x) => x.id !== id)),
      addLiability: (v) => setLiabilities((s) => [{ id: nextId(s), ...v, remaining: 0, status: "Active" }, ...s]),
      removeLiability: (id) => setLiabilities((s) => s.filter((x) => x.id !== id)),
      addGoal: (v) => setGoals((s) => [{ id: nextId(s), name: v.name, icon: goalIconMap[v.iconKey] ?? PiggyBank, target: v.target, current: v.current, date: v.date }, ...s]),
      removeGoal: (id) => setGoals((s) => s.filter((x) => x.id !== id)),
      addBudget: (v) => setBudgets((s) => [v, ...s.filter((b) => b.name !== v.name)]),
      removeBudget: (name) => setBudgets((s) => s.filter((x) => x.name !== name)),
      addBill: (v) => setBills((s) => [{ id: nextId(s), name: v.name, category: v.category, due: v.due, amount: v.amount, icon: billIconMap[v.iconKey] ?? Receipt, status: "Upcoming" }, ...s]),
      removeBill: (id) => setBills((s) => s.filter((x) => x.id !== id)),
      openDialog: (k) => setDialog(k),
    }),
    [accounts, incomes, expenses, assets, liabilities, goals, budgets, bills],
  );

  return (
    <FinanceCtx.Provider value={value}>
      {children}
      <EntityDialogs open={dialog} onClose={() => setDialog(null)} />
    </FinanceCtx.Provider>
  );
}

// ---------- Dialogs ----------
const today = () => new Date().toISOString().slice(0, 10);
const todayDMY = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function EntityDialogs({ open, onClose }: { open: EntityKind | null; onClose: () => void }) {
  const f = useFinance();
  return (
    <>
      <FormDialog open={open === "account"} onClose={onClose} title="Add account"
        fields={[
          { key: "name", label: "Account name", type: "text", required: true },
          { key: "bank", label: "Bank / Provider", type: "text", required: true },
          { key: "type", label: "Account type", type: "select", options: ["Savings", "Current", "Cash", "UPI Wallet", "Credit Card", "Investment Account", "Loan Account"], required: true },
          { key: "balance", label: "Current balance (₹)", type: "number", required: true },
        ]}
        onSubmit={(v) => f.addAccount({ name: v.name, bank: v.bank, type: v.type, balance: Number(v.balance) })}
      />
      <FormDialog open={open === "income"} onClose={onClose} title="Add income"
        fields={[
          { key: "source", label: "Source", type: "text", required: true },
          { key: "category", label: "Category", type: "select", options: ["Salary", "Bonus", "Freelancing", "Business", "Rental Income", "Interest", "Dividend", "Cashback", "Refund", "Gift"], required: true },
          { key: "account", label: "Account", type: "text", placeholder: "e.g. HDFC •• 4021" },
          { key: "amount", label: "Amount (₹)", type: "number", required: true },
          { key: "date", label: "Date", type: "date", default: today() },
          { key: "recurring", label: "Recurring", type: "switch" },
        ]}
        onSubmit={(v) => f.addIncome({ source: v.source, category: v.category, account: v.account || "—", amount: Number(v.amount), date: v.date || today(), recurring: !!v.recurring })}
      />
      <FormDialog open={open === "expense"} onClose={onClose} title="Add expense"
        fields={[
          { key: "merchant", label: "Merchant / Payee", type: "text", required: true },
          { key: "category", label: "Category", type: "select", options: ["Groceries", "Rent", "Electricity", "Water", "Internet", "Mobile Recharge", "Fuel", "Food", "Shopping", "Medical", "Education", "Entertainment", "Travel", "Insurance", "Investment", "EMI", "Others"], required: true },
          { key: "account", label: "Account", type: "text", placeholder: "e.g. HDFC •• 4021" },
          { key: "method", label: "Payment method", type: "select", options: ["UPI", "Card", "Cash", "Bank transfer", "Netbanking"] },
          { key: "amount", label: "Amount (₹)", type: "number", required: true },
          { key: "date", label: "Date", type: "date", default: today() },
        ]}
        onSubmit={(v) => f.addExpense({ merchant: v.merchant, category: v.category, account: v.account || "—", method: v.method || "UPI", amount: Number(v.amount), date: v.date || today() })}
      />
      <FormDialog open={open === "asset"} onClose={onClose} title="Add asset"
        fields={[
          { key: "name", label: "Asset name", type: "text", required: true },
          { key: "type", label: "Type", type: "select", options: ["Cash", "Bank", "FD", "Gold", "Silver", "Stocks", "Mutual Funds", "PPF", "EPF", "NPS", "Property", "Vehicle", "Crypto"], required: true },
          { key: "purchase", label: "Purchase value (₹)", type: "number", required: true },
          { key: "current", label: "Current value (₹)", type: "number", required: true },
          { key: "date", label: "Purchase date", type: "date", default: today() },
        ]}
        onSubmit={(v) => f.addAsset({ name: v.name, type: v.type, purchase: Number(v.purchase), current: Number(v.current), date: v.date || today() })}
      />
      <FormDialog open={open === "liability"} onClose={onClose} title="Add liability"
        fields={[
          { key: "name", label: "Name", type: "text", required: true },
          { key: "type", label: "Type", type: "select", options: ["Home Loan", "Car Loan", "Education Loan", "Personal Loan", "Credit Card", "Borrowed Money"], required: true },
          { key: "balance", label: "Outstanding balance (₹)", type: "number", required: true },
          { key: "rate", label: "Interest rate (%)", type: "number" },
          { key: "emi", label: "EMI (₹)", type: "number" },
          { key: "due", label: "Next due date", type: "date", default: today() },
        ]}
        onSubmit={(v) => f.addLiability({ name: v.name, type: v.type, balance: Number(v.balance), rate: Number(v.rate || 0), emi: Number(v.emi || 0), due: v.due || today() })}
      />
      <FormDialog open={open === "goal"} onClose={onClose} title="Create goal"
        fields={[
          { key: "name", label: "Goal name", type: "text", required: true },
          { key: "iconKey", label: "Icon", type: "select", options: ["PiggyBank", "Plane", "Home", "Car", "GraduationCap"], default: "PiggyBank" },
          { key: "target", label: "Target amount (₹)", type: "number", required: true },
          { key: "current", label: "Saved so far (₹)", type: "number", default: "0" },
          { key: "date", label: "Target date", type: "date", default: today() },
        ]}
        onSubmit={(v) => f.addGoal({ name: v.name, iconKey: v.iconKey || "PiggyBank", target: Number(v.target), current: Number(v.current || 0), date: v.date || today() })}
      />
      <FormDialog open={open === "budget"} onClose={onClose} title="Set budget"
        fields={[
          { key: "name", label: "Category", type: "text", required: true, placeholder: "e.g. Dining out" },
          { key: "budget", label: "Monthly budget (₹)", type: "number", required: true },
          { key: "spent", label: "Spent so far (₹)", type: "number", default: "0" },
        ]}
        onSubmit={(v) => f.addBudget({ name: v.name, budget: Number(v.budget), spent: Number(v.spent || 0) })}
      />
      <FormDialog open={open === "bill"} onClose={onClose} title="Add bill"
        fields={[
          { key: "name", label: "Bill name", type: "text", required: true },
          { key: "category", label: "Category", type: "select", options: ["Rent", "Utilities", "Internet", "Mobile", "Credit Card", "Insurance", "Subscriptions", "EMI", "Others"], required: true },
          { key: "iconKey", label: "Icon", type: "select", options: ["Home", "Zap", "Wifi", "Smartphone", "CreditCard", "ShieldCheck", "Tv", "Receipt"], default: "Receipt" },
          { key: "amount", label: "Amount (₹)", type: "number", required: true },
          { key: "due", label: "Due date (DD/MM/YYYY)", type: "text", default: todayDMY(), required: true },
        ]}
        onSubmit={(v) => f.addBill({ name: v.name, category: v.category, iconKey: v.iconKey || "Receipt", amount: Number(v.amount), due: v.due || todayDMY() })}
      />
    </>
  );
}

type FieldDef =
  | { key: string; label: string; type: "text" | "number" | "date"; required?: boolean; placeholder?: string; default?: string }
  | { key: string; label: string; type: "select"; options: string[]; required?: boolean; default?: string; placeholder?: string }
  | { key: string; label: string; type: "switch"; default?: string; required?: boolean; placeholder?: string }
  | { key: string; label: string; type: "textarea"; required?: boolean; placeholder?: string; default?: string };

function FormDialog({
  open, onClose, title, fields, onSubmit,
}: {
  open: boolean; onClose: () => void; title: string;
  fields: FieldDef[];
  onSubmit: (values: Record<string, string | boolean>) => void;
}) {
  const initial = useMemo(() => {
    const o: Record<string, string | boolean> = {};
    fields.forEach((f) => {
      if (f.type === "switch") o[f.key] = false;
      else o[f.key] = f.default ?? "";
    });
    return o;
  }, [fields]);
  const [values, setValues] = useState<Record<string, string | boolean>>(initial);

  // reset when reopened
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (open) setValues(initial);
  }

  const set = (k: string, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));

  const canSubmit = fields.every((f) => {
    if (!f.required) return true;
    const v = values[f.key];
    return typeof v === "string" ? v.trim().length > 0 : true;
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === "select" ? (
                <Select value={String(values[f.key] ?? "")} onValueChange={(v) => set(f.key, v)}>
                  <SelectTrigger><SelectValue placeholder={f.placeholder ?? "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : f.type === "switch" ? (
                <div className="flex items-center gap-2">
                  <Switch checked={!!values[f.key]} onCheckedChange={(v) => set(f.key, v)} />
                  <span className="text-xs text-muted-foreground">Repeat this every period</span>
                </div>
              ) : f.type === "textarea" ? (
                <Textarea value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              ) : (
                <Input
                  type={f.type}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              )}
            </Field>
          ))}
          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}