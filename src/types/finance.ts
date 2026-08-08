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
  amount: number;
  recurring: boolean;
};

export type Expense = {
  id: string;
  date: string;
  merchant: string;
  category: string;
  account: string;
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
  | "contribution";