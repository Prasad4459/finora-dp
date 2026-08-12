// Mapping layer between Supabase rows (snake_case, enums) and the UI models
// used by the existing Finora components. Keeps the UI unchanged.
import { PiggyBank, Receipt } from "lucide-react";
import {
  ACCOUNT_TYPE_META,
  BILL_ICON_MAP,
  DEFAULT_ACCOUNT_META,
  GOAL_ICON_MAP,
} from "@/constants/finance";
import type {
  AssetRow,
  AssetType,
  BillRow,
  GoalRow,
  LiabilityRow,
  LiabilityType,
  Transaction,
  Wallet,
  WalletType,
} from "@/types/database";
import type { Account, Asset, Bill, Expense, Goal, Income, Liability } from "@/types/finance";

/* ---------------- dates ---------------- */
// All dates are Indian calendar dates (Asia/Kolkata) — see src/lib/date-in.ts.
export { todayISO as todayISODate } from "@/lib/date-in";
import { todayISO as todayISODateFn } from "@/lib/date-in";

/** "2026-08-06" -> "06/08/2026" */
export const isoToDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

/** "06/08/2026" (or an ISO string) -> "2026-08-06" */
export const dmyToISO = (value: string | null | undefined) => {
  if (!value) return todayISODateFn();
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return todayISODateFn();
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

/* ---------------- enum <-> label ---------------- */

const WALLET_TYPE_BY_LABEL: Record<string, WalletType> = {
  Savings: "bank_account",
  Current: "bank_account",
  Cash: "cash",
  "UPI Wallet": "upi_wallet",
  "Credit Card": "credit_card",
  "Investment Account": "investment_account",
  "Loan Account": "loan_account",
};

const WALLET_LABEL_BY_TYPE: Record<WalletType, string> = {
  bank_account: "Savings",
  cash: "Cash",
  upi_wallet: "UPI Wallet",
  credit_card: "Credit Card",
  investment_account: "Investment Account",
  loan_account: "Loan Account",
};

export const walletTypeFromLabel = (label: string): WalletType =>
  WALLET_TYPE_BY_LABEL[label] ?? "bank_account";

const ASSET_TYPE_BY_LABEL: Record<string, AssetType> = {
  Cash: "cash",
  Bank: "bank",
  FD: "fixed_deposit",
  RD: "recurring_deposit",
  Gold: "gold",
  Silver: "silver",
  "Digital Gold": "digital_gold",
  "Gold ETF": "gold_etf",
  "Gold Fund": "gold_fund",
  "Sovereign Gold Bond": "sovereign_gold_bond",
  Stocks: "stocks",
  "Mutual Funds": "mutual_fund",
  ETF: "etf",
  Bonds: "bond",
  REIT: "reit",
  InvIT: "invit",
  PPF: "ppf",
  EPF: "epf",
  NPS: "nps",
  "Sukanya Samriddhi": "sukanya_samriddhi",
  NSC: "nsc",
  KVP: "kvp",
  SCSS: "scss",
  "Post Office": "post_office",
  Property: "property",
  Vehicle: "vehicle",
  Crypto: "crypto",
};

export const ASSET_LABEL_BY_TYPE: Record<AssetType, string> = {
  cash: "Cash",
  bank: "Bank",
  fixed_deposit: "FD",
  recurring_deposit: "RD",
  gold: "Gold",
  silver: "Silver",
  digital_gold: "Digital Gold",
  gold_etf: "Gold ETF",
  gold_fund: "Gold Fund",
  sovereign_gold_bond: "Sovereign Gold Bond",
  stocks: "Stocks",
  mutual_fund: "Mutual Funds",
  etf: "ETF",
  bond: "Bonds",
  reit: "REIT",
  invit: "InvIT",
  ppf: "PPF",
  epf: "EPF",
  nps: "NPS",
  sukanya_samriddhi: "Sukanya Samriddhi",
  nsc: "NSC",
  kvp: "KVP",
  scss: "SCSS",
  post_office: "Post Office",
  property: "Property",
  vehicle: "Vehicle",
  crypto: "Crypto",
  other: "Other",
};

export const assetTypeFromLabel = (label: string): AssetType =>
  ASSET_TYPE_BY_LABEL[label] ?? "other";

const LIABILITY_TYPE_BY_LABEL: Record<string, LiabilityType> = {
  "Home Loan": "home_loan",
  "Car Loan": "car_loan",
  "Education Loan": "education_loan",
  "Personal Loan": "personal_loan",
  "Credit Card": "credit_card",
  "Borrowed Money": "borrowed_money",
};

const LIABILITY_LABEL_BY_TYPE: Record<LiabilityType, string> = {
  home_loan: "Home Loan",
  car_loan: "Car Loan",
  education_loan: "Education Loan",
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  borrowed_money: "Borrowed Money",
  other: "Other",
};

export const liabilityTypeFromLabel = (label: string): LiabilityType =>
  LIABILITY_TYPE_BY_LABEL[label] ?? "other";

/* ---------------- row -> UI ---------------- */

export const toAccount = (w: Wallet): Account => {
  // `icon` stores the original display label (e.g. "Current") so the UI keeps
  // the exact account type the user picked, even where enums collapse values.
  const label = w.icon || WALLET_LABEL_BY_TYPE[w.type];
  const meta = ACCOUNT_TYPE_META[label] ?? DEFAULT_ACCOUNT_META;
  return {
    id: w.id,
    name: w.name,
    bank: w.institution ?? "—",
    type: label,
    balance: Number(w.balance),
    icon: meta.icon,
    color: meta.color,
    updated: w.updated_at.slice(0, 10),
  };
};

export const toIncome = (t: Transaction, categoryName: string, walletName: string): Income => ({
  id: t.id,
  date: t.transaction_date,
  source: t.payee ?? "—",
  category: categoryName,
  account: walletName,
  walletId: t.wallet_id,
  amount: Number(t.amount),
  recurring: t.is_recurring,
});

export const toExpense = (t: Transaction, categoryName: string, walletName: string): Expense => ({
  id: t.id,
  date: t.transaction_date,
  merchant: t.payee ?? "—",
  category: categoryName,
  account: walletName,
  walletId: t.wallet_id,
  method: t.payment_method ?? "UPI",
  amount: Number(t.amount),
});

export const toAsset = (a: AssetRow): Asset => {
  // Generated types may lag behind the investment migration.
  const x = a as AssetRow & {
    units?: number | null;
    avg_cost?: number | null;
    last_price?: number | null;
    interest_rate?: number | null;
    compounding?: string | null;
    maturity_date?: string | null;
    maturity_value?: number | null;
    folio_number?: string | null;
    is_active?: boolean | null;
    last_price_at?: string | null;
    symbol?: string | null;
    exchange?: string | null;
    price_source?: string | null;
    price_unit?: string | null;
  };
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    id: a.id,
    name: a.name,
    type: ASSET_LABEL_BY_TYPE[a.type] ?? "Other",
    purchase: Number(a.purchase_value),
    current: Number(a.current_value),
    date: a.purchase_date ?? a.created_at.slice(0, 10),
    units: num(x.units ?? a.quantity),
    avgCost: num(x.avg_cost),
    lastPrice: num(x.last_price),
    rate: num(x.interest_rate),
    compounding: x.compounding ?? null,
    maturityDate: x.maturity_date ?? null,
    maturityValue: num(x.maturity_value),
    folio: x.folio_number ?? null,
    institution: a.institution ?? null,
    isActive: x.is_active ?? true,
    lastPriceAt: x.last_price_at ?? null,
    symbol: x.symbol ?? null,
    exchange: x.exchange ?? null,
    priceSource: x.price_source ?? "manual",
    priceUnit: x.price_unit ?? "per_unit",
  };
};

export const toLiability = (l: LiabilityRow): Liability => ({
  id: l.id,
  name: l.name,
  type: LIABILITY_LABEL_BY_TYPE[l.type] ?? "Other",
  balance: Number(l.outstanding_balance),
  rate: Number(l.interest_rate),
  emi: Number(l.emi_amount),
  due: l.next_due_date ?? todayISODateFn(),
  remaining: l.remaining_months ?? 0,
  status: l.status === "active" ? "Active" : l.status,
});

export const toGoal = (g: GoalRow): Goal => ({
  id: g.id,
  name: g.name,
  icon: GOAL_ICON_MAP[g.icon ?? ""] ?? PiggyBank,
  target: Number(g.target_amount),
  current: Number(g.saved_amount),
  date: g.target_date ?? todayISODateFn(),
});

export const toBill = (b: BillRow): Bill => ({
  id: b.id,
  name: b.name,
  category: b.notes || "Others",
  due: isoToDMY(b.due_date),
  dueISO: (b.due_date ?? "").slice(0, 10),
  amount: Number(b.amount),
  icon: BILL_ICON_MAP[b.icon ?? ""] ?? Receipt,
  iconKey: b.icon ?? "Receipt",
  status: b.status,
  frequency: b.frequency,
  isRecurring: b.is_recurring,
  walletId: b.wallet_id,
  categoryId: b.category_id,
  description: b.description ?? "",
  reminderEnabled: b.reminder_enabled,
  reminderDays: b.reminder_days_before,
  lastPaidDate: b.last_paid_date,
});
