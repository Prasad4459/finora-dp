import type { LucideIcon } from "lucide-react";

export type Account = {
  id: string;
  name: string;
  bank: string;
  type: string;
  balance: number;
  icon: LucideIcon;
  color: string;
  updated: string;
};

export type Income = {
  id: string;
  date: string;
  source: string;
  category: string;
  account: string;
  /** Authoritative ledger type ('income' | 'dividend' | 'refund'). */
  txType?: string;
  /** Authoritative wallet UUID — never resolved by display name. */
  walletId: string | null;
  amount: number;
  recurring: boolean;
};

export type Expense = {
  id: string;
  date: string;
  merchant: string;
  category: string;
  account: string;
  /** Authoritative wallet UUID — never resolved by display name. */
  walletId: string | null;
  method: string;
  amount: number;
};

export type Asset = {
  id: string;
  name: string;
  type: string;
  purchase: number;
  current: number;
  date: string;
  /* ---- investment facet (optional; physical assets leave these empty) ---- */
  units?: number | null;
  avgCost?: number | null;
  lastPrice?: number | null;
  rate?: number | null;
  compounding?: string | null;
  maturityDate?: string | null;
  maturityValue?: number | null;
  folio?: string | null;
  institution?: string | null;
  /* ---- market identity (Release 7B; used by future price refresh) ---- */
  symbol?: string | null;
  exchange?: string | null;
  /** nse | bse | amfi | gold_inr | manual */
  priceSource?: string | null;
  /** per_unit | per_gram */
  priceUnit?: string | null;
  /** When last_price was last set. Null for holdings never priced. */
  lastPriceAt?: string | null;
  /** False once a holding has been fully redeemed (kept for history). */
  isActive?: boolean;
};

/** A scheduled recurring contribution (SIP / RD instalment / yearly deposit). */
export type InvestmentContribution = {
  id: string;
  assetId: string;
  assetName: string;
  walletId: string | null;
  amount: number;
  frequency: string;
  /** ISO "YYYY-MM-DD". */
  nextDueISO: string;
  autoDebit: boolean;
  status: string;
};

export type Liability = {
  id: string;
  name: string;
  type: string;
  balance: number;
  rate: number;
  emi: number;
  due: string;
  remaining: number;
  status: string;
};

export type Goal = {
  id: string;
  name: string;
  icon: LucideIcon;
  target: number;
  current: number;
  date: string;
};

export type Budget = {
  id: string;
  name: string;
  spent: number;
  budget: number;
  categoryId: string | null;
  /** The budget's own period — never the current month. */
  periodYear: number;
  periodMonth: number;
  /** e.g. "Jul 2026". */
  periodLabel: string;
};

export type Bill = {
  id: string;
  name: string;
  category: string;
  /** Display date, DD/MM/YYYY. */
  due: string;
  /** Occurrence due date, ISO "YYYY-MM-DD" (Asia/Kolkata calendar). */
  dueISO: string;
  amount: number;
  icon: LucideIcon;
  iconKey: string;
  /** Raw stored status — the UI status is derived (see services/bills.ts). */
  status: string;
  frequency: string;
  isRecurring: boolean;
  walletId: string | null;
  /** Resolved wallet name, filled by the page that has the wallet list. */
  accountName?: string;
  categoryId: string | null;
  description: string;
  reminderEnabled: boolean;
  reminderDays: number;
  lastPaidDate: string | null;
};

export type EntityKind =
  | "account"
  | "income"
  | "expense"
  | "asset"
  | "liability"
  | "goal"
  | "budget"
  | "bill"
  | "transfer"
  | "investment"
  | "dividend"
  | "refund"
  | "emi"
  | "redemption"
  | "sip"
  | "contribution";