import { PiggyBank, Receipt } from "lucide-react";
import {
  ACCOUNT_TYPE_META,
  BILL_ICON_MAP,
  DEFAULT_ACCOUNT_META,
  GOAL_ICON_MAP,
} from "@/constants/finance";
import type {
  Account,
  Asset,
  Bill,
  Budget,
  Expense,
  Goal,
  Income,
  Liability,
} from "@/types/finance";

export const nextId = (arr: { id: number }[]) =>
  arr.length ? Math.max(...arr.map((a) => a.id)) + 1 : 1;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const buildAccount = (
  list: Account[],
  v: Omit<Account, "id" | "icon" | "color" | "updated">,
): Account => {
  const meta = ACCOUNT_TYPE_META[v.type] ?? DEFAULT_ACCOUNT_META;
  return {
    id: nextId(list),
    ...v,
    icon: meta.icon,
    color: meta.color,
    updated: todayISO(),
  };
};

export const buildIncome = (list: Income[], v: Omit<Income, "id">): Income => ({
  id: nextId(list),
  ...v,
});

export const buildExpense = (list: Expense[], v: Omit<Expense, "id">): Expense => ({
  id: nextId(list),
  ...v,
});

export const buildAsset = (list: Asset[], v: Omit<Asset, "id">): Asset => ({
  id: nextId(list),
  ...v,
});

export const buildLiability = (
  list: Liability[],
  v: Omit<Liability, "id" | "remaining" | "status">,
): Liability => ({
  id: nextId(list),
  ...v,
  remaining: 0,
  status: "Active",
});

export const buildGoal = (
  list: Goal[],
  v: { name: string; iconKey: string; target: number; current: number; date: string },
): Goal => ({
  id: nextId(list),
  name: v.name,
  icon: GOAL_ICON_MAP[v.iconKey] ?? PiggyBank,
  target: v.target,
  current: v.current,
  date: v.date,
});

export const upsertBudget = (list: Budget[], v: Budget): Budget[] => [
  v,
  ...list.filter((b) => b.name !== v.name),
];

export const buildBill = (
  list: Bill[],
  v: { name: string; category: string; due: string; amount: number; iconKey: string },
): Bill => ({
  id: nextId(list),
  name: v.name,
  category: v.category,
  due: v.due,
  amount: v.amount,
  icon: BILL_ICON_MAP[v.iconKey] ?? Receipt,
  status: "Upcoming",
});