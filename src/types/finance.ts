import type { LucideIcon } from "lucide-react";

export type Account = {
  id: number;
  name: string;
  bank: string;
  type: string;
  balance: number;
  icon: LucideIcon;
  color: string;
  updated: string;
};

export type Income = {
  id: number;
  date: string;
  source: string;
  category: string;
  account: string;
  amount: number;
  recurring: boolean;
};

export type Expense = {
  id: number;
  date: string;
  merchant: string;
  category: string;
  account: string;
  method: string;
  amount: number;
};

export type Asset = {
  id: number;
  name: string;
  type: string;
  purchase: number;
  current: number;
  date: string;
};

export type Liability = {
  id: number;
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
  id: number;
  name: string;
  icon: LucideIcon;
  target: number;
  current: number;
  date: string;
};

export type Budget = { name: string; spent: number; budget: number };

export type Bill = {
  id: number;
  name: string;
  category: string;
  due: string;
  amount: number;
  icon: LucideIcon;
  status: string;
};

export type EntityKind =
  | "account"
  | "income"
  | "expense"
  | "asset"
  | "liability"
  | "goal"
  | "budget"
  | "bill";