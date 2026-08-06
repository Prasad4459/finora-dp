import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EntityDialogs } from "@/components/forms/entity-dialogs";
import {
  assetsRepo,
  billsRepo,
  budgetsRepo,
  categoriesRepo,
  goalsRepo,
  liabilitiesRepo,
  notificationsRepo,
  transactionsRepo,
  walletsRepo,
} from "@/repositories";
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

type Ctx = {
  loading: boolean;
  accounts: Account[]; addAccount: (v: Omit<Account, "id" | "icon" | "color" | "updated">) => void; removeAccount: (id: string) => void;
  incomes: Income[]; addIncome: (v: Omit<Income, "id">) => void; removeIncome: (id: string) => void;
  expenses: Expense[]; addExpense: (v: Omit<Expense, "id">) => void; removeExpense: (id: string) => void;
  assets: Asset[]; addAsset: (v: Omit<Asset, "id">) => void; removeAsset: (id: string) => void;
  liabilities: Liability[]; addLiability: (v: Omit<Liability, "id" | "remaining" | "status">) => void; removeLiability: (id: string) => void;
  goals: Goal[]; addGoal: (v: { name: string; iconKey: string; target: number; current: number; date: string }) => void; removeGoal: (id: string) => void;
  budgets: Budget[]; addBudget: (v: { name: string; budget: number; spent?: number }) => void; removeBudget: (name: string) => void;
  bills: Bill[]; addBill: (v: { name: string; category: string; due: string; amount: number; iconKey: string }) => void; removeBill: (id: string) => void;
  notifications: Notification[]; markNotificationRead: (id: string) => void; removeNotification: (id: string) => void;
  openDialog: (k: EntityKind) => void;
};

const FinanceCtx = createContext<Ctx | null>(null);

export function useFinance() {
  const v = useContext(FinanceCtx);
  if (!v) throw new Error("useFinance must be used within FinanceProvider");
  return v;
}

const keys = {
  wallets: ["wallets"] as const,
  categories: ["categories"] as const,
  transactions: ["transactions"] as const,
  assets: ["assets"] as const,
  liabilities: ["liabilities"] as const,
  goals: ["goals"] as const,
  budgets: ["budgets"] as const,
  bills: ["bills"] as const,
  notifications: ["notifications"] as const,
};

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message.replace(/^\[[^\]]+\]\s*/, "") : "Something went wrong";

export function FinanceProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<EntityKind | null>(null);

  const walletsQ = useQuery({ queryKey: keys.wallets, queryFn: () => walletsRepo.listActive() });
  const categoriesQ = useQuery({ queryKey: keys.categories, queryFn: () => categoriesRepo.listAll() });
  const txQ = useQuery({ queryKey: keys.transactions, queryFn: () => transactionsRepo.list({ orderBy: "transaction_date", limit: 500 }) });
  const assetsQ = useQuery({ queryKey: keys.assets, queryFn: () => assetsRepo.listAll() });
  const liabilitiesQ = useQuery({ queryKey: keys.liabilities, queryFn: () => liabilitiesRepo.listActive() });
  const goalsQ = useQuery({ queryKey: keys.goals, queryFn: () => goalsRepo.listActive() });
  const budgetsQ = useQuery({ queryKey: keys.budgets, queryFn: () => budgetsRepo.list({ orderBy: "created_at" }) });
  const billsQ = useQuery({ queryKey: keys.bills, queryFn: () => billsRepo.listUpcoming() });
  const notificationsQ = useQuery({ queryKey: keys.notifications, queryFn: () => notificationsRepo.listRecent() });

  const loading =
    walletsQ.isLoading || categoriesQ.isLoading || txQ.isLoading || assetsQ.isLoading ||
    liabilitiesQ.isLoading || goalsQ.isLoading || budgetsQ.isLoading || billsQ.isLoading;

  const walletRows = useMemo<Wallet[]>(() => walletsQ.data ?? [], [walletsQ.data]);
  const categoryRows = useMemo<Category[]>(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const txRows = useMemo(() => txQ.data ?? [], [txQ.data]);

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
  const assets = useMemo(() => (assetsQ.data ?? []).map(toAsset), [assetsQ.data]);
  const liabilities = useMemo(() => (liabilitiesQ.data ?? []).map(toLiability), [liabilitiesQ.data]);
  const goals = useMemo(() => (goalsQ.data ?? []).map(toGoal), [goalsQ.data]);
  const bills = useMemo(() => (billsQ.data ?? []).map(toBill), [billsQ.data]);
  const notifications = useMemo(() => notificationsQ.data ?? [], [notificationsQ.data]);

  // Budgets: amount comes from the budgets table, "spent" is derived from this
  // month's expense transactions in the matching category.
  const budgets = useMemo<Budget[]>(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return (budgetsQ.data ?? []).map((b) => {
      const name = b.name ?? categoryName(b.category_id);
      const spent = txRows
        .filter((t) => t.type === "expense" && categoryName(t.category_id) === name)
        .filter((t) => {
          const d = new Date(t.transaction_date);
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        })
        .reduce((s, t) => s + Number(t.amount), 0);
      return { id: b.id, name, budget: Number(b.amount), spent };
    });
  }, [budgetsQ.data, txRows, categoryRows]);

  /** Finds a category by name (creating it when missing) so transactions stay linked. */
  const resolveCategoryId = async (name: string, kind: CategoryKind): Promise<string | null> => {
    if (!name) return null;
    const existing = categoryRows.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && (c.kind === kind || c.kind === "both"),
    );
    if (existing) return existing.id;
    const created = await categoriesRepo.create({ name, kind });
    qc.invalidateQueries({ queryKey: keys.categories });
    return created.id;
  };

  const resolveWalletId = (name?: string): string | null => {
    if (!name || name === "—") return null;
    const w = walletRows.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return w?.id ?? null;
  };

  const run = <TArgs,>(fn: (args: TArgs) => Promise<unknown>, invalidate: readonly (readonly string[])[], success: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => {
        invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
        toast.success(success);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });

  /* eslint-disable react-hooks/rules-of-hooks -- `run` calls useMutation in a fixed order */
  const createAccount = run(
    (v: Omit<Account, "id" | "icon" | "color" | "updated">) =>
      walletsRepo.create({
        name: v.name,
        institution: v.bank,
        type: walletTypeFromLabel(v.type),
        icon: v.type,
        balance: v.balance,
      }),
    [keys.wallets], "Account added",
  );
  const deleteAccount = run((id: string) => walletsRepo.remove(id), [keys.wallets], "Account deleted");

  const createIncome = run(async (v: Omit<Income, "id">) => {
    const category_id = await resolveCategoryId(v.category, "income");
    return transactionsRepo.create({
      type: "income",
      amount: v.amount,
      transaction_date: v.date || todayISODate(),
      payee: v.source,
      category_id,
      wallet_id: resolveWalletId(v.account),
      is_recurring: v.recurring,
    });
  }, [keys.transactions], "Income added");

  const createExpense = run(async (v: Omit<Expense, "id">) => {
    const category_id = await resolveCategoryId(v.category, "expense");
    return transactionsRepo.create({
      type: "expense",
      amount: v.amount,
      transaction_date: v.date || todayISODate(),
      payee: v.merchant,
      payment_method: v.method,
      category_id,
      wallet_id: resolveWalletId(v.account),
    });
  }, [keys.transactions], "Expense added");

  const deleteTransaction = run((id: string) => transactionsRepo.remove(id), [keys.transactions], "Deleted");

  const createAsset = run(
    (v: Omit<Asset, "id">) =>
      assetsRepo.create({
        name: v.name,
        type: assetTypeFromLabel(v.type),
        purchase_value: v.purchase,
        current_value: v.current,
        purchase_date: v.date || todayISODate(),
      }),
    [keys.assets], "Asset added",
  );
  const deleteAsset = run((id: string) => assetsRepo.remove(id), [keys.assets], "Asset deleted");

  const createLiability = run(
    (v: Omit<Liability, "id" | "remaining" | "status">) =>
      liabilitiesRepo.create({
        name: v.name,
        type: liabilityTypeFromLabel(v.type),
        outstanding_balance: v.balance,
        interest_rate: v.rate,
        emi_amount: v.emi,
        next_due_date: v.due || todayISODate(),
      }),
    [keys.liabilities], "Liability added",
  );
  const deleteLiability = run((id: string) => liabilitiesRepo.remove(id), [keys.liabilities], "Liability deleted");

  const createGoal = run(
    (v: { name: string; iconKey: string; target: number; current: number; date: string }) =>
      goalsRepo.create({
        name: v.name,
        icon: v.iconKey,
        target_amount: v.target,
        saved_amount: v.current,
        target_date: v.date || todayISODate(),
      }),
    [keys.goals], "Goal created",
  );
  const deleteGoal = run((id: string) => goalsRepo.remove(id), [keys.goals], "Goal deleted");

  const saveBudget = run(async (v: { name: string; budget: number }) => {
    const now = new Date();
    const existing = (budgetsQ.data ?? []).find((b) => (b.name ?? "").toLowerCase() === v.name.toLowerCase());
    if (existing) return budgetsRepo.update(existing.id, { amount: v.budget });
    const category_id = await resolveCategoryId(v.name, "expense");
    return budgetsRepo.create({
      name: v.name,
      amount: v.budget,
      category_id,
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
    });
  }, [keys.budgets], "Budget saved");
  const deleteBudget = run((id: string) => budgetsRepo.remove(id), [keys.budgets], "Budget removed");

  const createBill = run(
    (v: { name: string; category: string; due: string; amount: number; iconKey: string }) =>
      billsRepo.create({
        name: v.name,
        amount: v.amount,
        due_date: dmyToISO(v.due),
        icon: v.iconKey,
        notes: v.category,
      }),
    [keys.bills], "Bill added",
  );
  const deleteBill = run((id: string) => billsRepo.remove(id), [keys.bills], "Bill removed");

  const readNotification = run((id: string) => notificationsRepo.markRead(id), [keys.notifications], "Marked as read");
  const deleteNotification = run((id: string) => notificationsRepo.remove(id), [keys.notifications], "Notification removed");
  /* eslint-enable react-hooks/rules-of-hooks */

  const value: Ctx = {
    loading,
    accounts, incomes, expenses, assets, liabilities, goals, budgets, bills, notifications,
    addAccount: (v) => createAccount.mutate(v),
    removeAccount: (id) => deleteAccount.mutate(id),
    addIncome: (v) => createIncome.mutate(v),
    removeIncome: (id) => deleteTransaction.mutate(id),
    addExpense: (v) => createExpense.mutate(v),
    removeExpense: (id) => deleteTransaction.mutate(id),
    addAsset: (v) => createAsset.mutate(v),
    removeAsset: (id) => deleteAsset.mutate(id),
    addLiability: (v) => createLiability.mutate(v),
    removeLiability: (id) => deleteLiability.mutate(id),
    addGoal: (v) => createGoal.mutate(v),
    removeGoal: (id) => deleteGoal.mutate(id),
    addBudget: (v) => saveBudget.mutate({ name: v.name, budget: v.budget }),
    removeBudget: (name) => {
      const found = budgets.find((b) => b.name === name);
      if (found) deleteBudget.mutate(found.id);
    },
    addBill: (v) => createBill.mutate(v),
    removeBill: (id) => deleteBill.mutate(id),
    markNotificationRead: (id) => readNotification.mutate(id),
    removeNotification: (id) => deleteNotification.mutate(id),
    openDialog: (k) => setDialog(k),
  };

  return (
    <FinanceCtx.Provider value={value}>
      {loading && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
          <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      {children}
      <EntityDialogs open={dialog} onClose={() => setDialog(null)} />
    </FinanceCtx.Provider>
  );
}
