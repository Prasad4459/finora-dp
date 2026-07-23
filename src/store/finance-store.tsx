import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { EntityDialogs } from "@/components/forms/entity-dialogs";
import {
  seedAccounts,
  seedAssets,
  seedBills,
  seedBudgets,
  seedExpenses,
  seedGoals,
  seedIncomes,
  seedLiabilities,
} from "@/mock/finance";
import {
  buildAccount,
  buildAsset,
  buildBill,
  buildExpense,
  buildGoal,
  buildIncome,
  buildLiability,
  upsertBudget,
} from "@/services/finance";
import type {
  Account,
  Asset,
  Bill,
  Budget,
  EntityKind,
  Expense,
  Goal,
  Income,
  Liability,
} from "@/types/finance";

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

  const value: Ctx = useMemo(
    () => ({
      accounts, incomes, expenses, assets, liabilities, goals, budgets, bills,
      addAccount: (v) => setAccounts((s) => [buildAccount(s, v), ...s]),
      removeAccount: (id) => setAccounts((s) => s.filter((x) => x.id !== id)),
      addIncome: (v) => setIncomes((s) => [buildIncome(s, v), ...s]),
      removeIncome: (id) => setIncomes((s) => s.filter((x) => x.id !== id)),
      addExpense: (v) => setExpenses((s) => [buildExpense(s, v), ...s]),
      removeExpense: (id) => setExpenses((s) => s.filter((x) => x.id !== id)),
      addAsset: (v) => setAssets((s) => [buildAsset(s, v), ...s]),
      removeAsset: (id) => setAssets((s) => s.filter((x) => x.id !== id)),
      addLiability: (v) => setLiabilities((s) => [buildLiability(s, v), ...s]),
      removeLiability: (id) => setLiabilities((s) => s.filter((x) => x.id !== id)),
      addGoal: (v) => setGoals((s) => [buildGoal(s, v), ...s]),
      removeGoal: (id) => setGoals((s) => s.filter((x) => x.id !== id)),
      addBudget: (v) => setBudgets((s) => upsertBudget(s, v)),
      removeBudget: (name) => setBudgets((s) => s.filter((x) => x.name !== name)),
      addBill: (v) => setBills((s) => [buildBill(s, v), ...s]),
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