import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EntityDialogs } from "@/components/forms/entity-dialogs";
import { categoriesRepo } from "@/repositories";
import { financeKeys } from "@/hooks/query-keys";
import { useWallets } from "@/hooks/use-wallets";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useAssets } from "@/hooks/use-assets";
import { useLiabilities } from "@/hooks/use-liabilities";
import { useGoals } from "@/hooks/use-goals";
import { useBudgets } from "@/hooks/use-budgets";
import { useBills } from "@/hooks/use-bills";
import { useNotifications } from "@/hooks/use-notifications";
import { currentMonthKey, isInMonth } from "@/services/finance";
import {
  assetTypeFromLabel,
  dmyToISO,
  liabilityTypeFromLabel,
  toAccount,
  toAsset,
  toBill,
  toExpense,
  toGoal,
  toIncome,
  toLiability,
  todayISODate,
  walletTypeFromLabel,
} from "@/lib/finance-mappers";
import type { Category, CategoryKind, Notification, Wallet } from "@/types/database";
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

export type AccountInput = Omit<Account, "id" | "icon" | "color" | "updated">;
export type IncomeInput = Omit<Income, "id">;
export type ExpenseInput = Omit<Expense, "id">;
export type AssetInput = Omit<Asset, "id">;
export type LiabilityInput = Omit<Liability, "id" | "remaining" | "status">;
export type GoalInput = { name: string; iconKey: string; target: number; current: number; date: string };
export type BudgetInput = { name: string; budget: number; spent?: number };
export type BillInput = { name: string; category: string; due: string; amount: number; iconKey: string };

/** Entity currently being edited; drives pre-populated dialogs. */
export type EditTarget =
  | { kind: "account"; entity: Account }
  | { kind: "income"; entity: Income }
  | { kind: "expense"; entity: Expense }
  | { kind: "asset"; entity: Asset }
  | { kind: "liability"; entity: Liability }
  | { kind: "goal"; entity: Goal }
  | { kind: "budget"; entity: Budget }
  | { kind: "bill"; entity: Bill };

type Ctx = {
  loading: boolean;
  accounts: Account[]; addAccount: (v: AccountInput) => void; updateAccount: (id: string, v: AccountInput) => void; removeAccount: (id: string) => void;
  incomes: Income[]; addIncome: (v: IncomeInput) => void; updateIncome: (id: string, v: IncomeInput) => void; removeIncome: (id: string) => void;
  expenses: Expense[]; addExpense: (v: ExpenseInput) => void; updateExpense: (id: string, v: ExpenseInput) => void; removeExpense: (id: string) => void;
  assets: Asset[]; addAsset: (v: AssetInput) => void; updateAsset: (id: string, v: AssetInput) => void; removeAsset: (id: string) => void;
  liabilities: Liability[]; addLiability: (v: LiabilityInput) => void; updateLiability: (id: string, v: LiabilityInput) => void; removeLiability: (id: string) => void;
  goals: Goal[]; addGoal: (v: GoalInput) => void; updateGoal: (id: string, v: GoalInput) => void; removeGoal: (id: string) => void;
  budgets: Budget[]; addBudget: (v: BudgetInput) => void; updateBudget: (id: string, v: BudgetInput) => void; removeBudget: (id: string) => void;
  bills: Bill[]; addBill: (v: BillInput) => void; updateBill: (id: string, v: BillInput) => void; removeBill: (id: string) => void;
  notifications: Notification[]; markNotificationRead: (id: string) => void; removeNotification: (id: string) => void;
  openDialog: (k: EntityKind) => void;
  openEditDialog: (target: EditTarget) => void;
};

const FinanceCtx = createContext<Ctx | null>(null);

export function useFinance() {
  const v = useContext(FinanceCtx);
  if (!v) throw new Error("useFinance must be used within FinanceProvider");
  return v;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<EntityKind | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const wallets = useWallets();
  const categories = useCategories();
  const transactions = useTransactions();
  const assetsData = useAssets();
  const liabilitiesData = useLiabilities();
  const goalsData = useGoals();
  const budgetsData = useBudgets();
  const billsData = useBills();
  const notificationsData = useNotifications();

  const loading =
    wallets.isLoading || categories.isLoading || transactions.isLoading || assetsData.isLoading ||
    liabilitiesData.isLoading || goalsData.isLoading || budgetsData.isLoading || billsData.isLoading;

  const walletRows = useMemo<Wallet[]>(() => wallets.rows, [wallets.rows]);
  const categoryRows = useMemo<Category[]>(() => categories.rows, [categories.rows]);
  const txRows = useMemo(() => transactions.rows, [transactions.rows]);

  const walletName = (id: string | null) => walletRows.find((w) => w.id === id)?.name ?? "—";
  const categoryName = (id: string | null) => categoryRows.find((c) => c.id === id)?.name ?? "Others";

  const accounts = useMemo(() => walletRows.map(toAccount), [walletRows]);
  const incomes = useMemo(
    () => txRows.filter((t) => t.type === "income").map((t) => toIncome(t, categoryName(t.category_id), walletName(t.wallet_id))),
    [txRows, categoryRows, walletRows],
  );
  const expenses = useMemo(
    () => txRows.filter((t) => t.type === "expense").map((t) => toExpense(t, categoryName(t.category_id), walletName(t.wallet_id))),
    [txRows, categoryRows, walletRows],
  );
  const assets = useMemo(() => assetsData.rows.map(toAsset), [assetsData.rows]);
  const liabilities = useMemo(() => liabilitiesData.rows.map(toLiability), [liabilitiesData.rows]);
  const goals = useMemo(() => goalsData.rows.map(toGoal), [goalsData.rows]);
  const bills = useMemo(() => billsData.rows.map(toBill), [billsData.rows]);
  const notifications = useMemo(() => notificationsData.rows, [notificationsData.rows]);

  // Budgets: the limit comes from the budgets table; "spent" is derived from this
  // month's expense transactions matched on category id (name only as fallback).
  const budgets = useMemo<Budget[]>(() => {
    const monthKey = currentMonthKey();
    return budgetsData.rows.map((b) => {
      const name = b.name ?? categoryName(b.category_id);
      const spent = txRows
        .filter((t) => t.type === "expense" && isInMonth(t.transaction_date, monthKey))
        .filter((t) =>
          b.category_id
            ? t.category_id === b.category_id
            : categoryName(t.category_id).toLowerCase() === name.toLowerCase(),
        )
        .reduce((s, t) => s + Number(t.amount), 0);
      return { id: b.id, name, budget: Number(b.amount), spent, categoryId: b.category_id };
    });
  }, [budgetsData.rows, txRows, categoryRows]);

  /** Finds a category by name (creating it when missing) so records stay linked. */
  const resolveCategoryId = async (name: string, kind: CategoryKind): Promise<string | null> => {
    if (!name) return null;
    const existing = categoryRows.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && (c.kind === kind || c.kind === "both"),
    );
    if (existing) return existing.id;
    const created = await categoriesRepo.create({ name, kind });
    qc.invalidateQueries({ queryKey: financeKeys.categories });
    return created.id;
  };

  const resolveWalletId = (name?: string): string | null => {
    if (!name || name === "—") return null;
    const w = walletRows.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return w?.id ?? null;
  };

  /* ---------- UI input -> database payload mappers ---------- */

  const walletPayload = (v: AccountInput) => ({
    name: v.name,
    institution: v.bank,
    type: walletTypeFromLabel(v.type),
    icon: v.type,
    balance: v.balance,
  });

  const incomePayload = async (v: IncomeInput) => ({
    type: "income" as const,
    amount: v.amount,
    transaction_date: v.date || todayISODate(),
    payee: v.source,
    category_id: await resolveCategoryId(v.category, "income"),
    wallet_id: resolveWalletId(v.account),
    is_recurring: v.recurring,
  });

  const expensePayload = async (v: ExpenseInput) => ({
    type: "expense" as const,
    amount: v.amount,
    transaction_date: v.date || todayISODate(),
    payee: v.merchant,
    payment_method: v.method,
    category_id: await resolveCategoryId(v.category, "expense"),
    wallet_id: resolveWalletId(v.account),
  });

  const assetPayload = (v: AssetInput) => ({
    name: v.name,
    type: assetTypeFromLabel(v.type),
    purchase_value: v.purchase,
    current_value: v.current,
    purchase_date: v.date || todayISODate(),
  });

  const liabilityPayload = (v: LiabilityInput) => ({
    name: v.name,
    type: liabilityTypeFromLabel(v.type),
    outstanding_balance: v.balance,
    interest_rate: v.rate,
    emi_amount: v.emi,
    next_due_date: v.due || todayISODate(),
  });

  const goalPayload = (v: GoalInput) => ({
    name: v.name,
    icon: v.iconKey,
    target_amount: v.target,
    saved_amount: v.current,
    target_date: v.date || todayISODate(),
  });

  const billPayload = (v: BillInput) => ({
    name: v.name,
    amount: v.amount,
    due_date: dmyToISO(v.due),
    icon: v.iconKey,
    notes: v.category,
  });

  const saveBudget = async (v: BudgetInput, id?: string) => {
    const existing = id
      ? budgetsData.rows.find((b) => b.id === id)
      : budgetsData.rows.find((b) => (b.name ?? "").toLowerCase() === v.name.toLowerCase());
    const category_id = await resolveCategoryId(v.name, "expense");
    if (existing) {
      budgetsData.update.mutate({ id: existing.id, values: { name: v.name, amount: v.budget, category_id } });
      return;
    }
    const now = new Date();
    budgetsData.create.mutate({
      name: v.name,
      amount: v.budget,
      category_id,
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
    });
  };

  const value: Ctx = {
    loading,
    accounts, incomes, expenses, assets, liabilities, goals, budgets, bills, notifications,

    addAccount: (v) => wallets.create.mutate(walletPayload(v)),
    updateAccount: (id, v) => wallets.update.mutate({ id, values: walletPayload(v) }),
    removeAccount: (id) => wallets.remove.mutate(id),

    addIncome: (v) => void incomePayload(v).then((values) => transactions.create.mutate(values)),
    updateIncome: (id, v) => void incomePayload(v).then((values) => transactions.update.mutate({ id, values })),
    removeIncome: (id) => transactions.remove.mutate(id),

    addExpense: (v) => void expensePayload(v).then((values) => transactions.create.mutate(values)),
    updateExpense: (id, v) => void expensePayload(v).then((values) => transactions.update.mutate({ id, values })),
    removeExpense: (id) => transactions.remove.mutate(id),

    addAsset: (v) => assetsData.create.mutate(assetPayload(v)),
    updateAsset: (id, v) => assetsData.update.mutate({ id, values: assetPayload(v) }),
    removeAsset: (id) => assetsData.remove.mutate(id),

    addLiability: (v) => liabilitiesData.create.mutate(liabilityPayload(v)),
    updateLiability: (id, v) => liabilitiesData.update.mutate({ id, values: liabilityPayload(v) }),
    removeLiability: (id) => liabilitiesData.remove.mutate(id),

    addGoal: (v) => goalsData.create.mutate(goalPayload(v)),
    updateGoal: (id, v) => goalsData.update.mutate({ id, values: goalPayload(v) }),
    removeGoal: (id) => goalsData.remove.mutate(id),

    addBudget: (v) => void saveBudget(v),
    updateBudget: (id, v) => void saveBudget(v, id),
    removeBudget: (id) => budgetsData.remove.mutate(id),

    addBill: (v) => billsData.create.mutate(billPayload(v)),
    updateBill: (id, v) => billsData.update.mutate({ id, values: billPayload(v) }),
    removeBill: (id) => billsData.remove.mutate(id),

    markNotificationRead: (id) => notificationsData.markRead.mutate(id),
    removeNotification: (id) => notificationsData.remove.mutate(id),

    openDialog: (k) => { setEditTarget(null); setDialog(k); },
    openEditDialog: (t) => { setEditTarget(t); setDialog(t.kind); },
  };

  const closeDialog = () => { setDialog(null); setEditTarget(null); };

  return (
    <FinanceCtx.Provider value={value}>
      {loading && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
          <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      {children}
      <EntityDialogs open={dialog} editing={editTarget} onClose={closeDialog} />
    </FinanceCtx.Provider>
  );
}
