import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EntityDialogs } from "@/components/forms/entity-dialogs";
import { categoriesRepo } from "@/repositories";
import { financeKeys } from "@/hooks/query-keys";
import { errorMessage } from "@/hooks/use-entity-mutation";
import { useWallets } from "@/hooks/use-wallets";
import { useCategories } from "@/hooks/use-categories";
import { useTransactionMutations } from "@/hooks/use-transactions";
import { useAssets } from "@/hooks/use-assets";
import { useLiabilities } from "@/hooks/use-liabilities";
import { useGoals } from "@/hooks/use-goals";
import { useBudgets } from "@/hooks/use-budgets";
import { useBills } from "@/hooks/use-bills";
import { useInvestmentContributions } from "@/hooks/use-investment-contributions";
import { useNotifications } from "@/hooks/use-notifications";
import { useFinanceSummary, type FinanceSummary } from "@/hooks/use-finance-summary";
import { computeTotals, type FinanceTotals } from "@/services/finance";
import { frequencyFromLabel, nextDueDate } from "@/services/bills";
import { useBillReminders } from "@/hooks/use-bill-reminders";
import { currentMonth, monthLongLabel, todayISO, type MonthRef } from "@/lib/date-in";
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
import type { Category, CategoryKind, Notification, TransactionInsert, Wallet } from "@/types/database";
import type {
  Account,
  Asset,
  Bill,
  Budget,
  EntityKind,
  Expense,
  Goal,
  Income,
  InvestmentContribution,
  Liability,
} from "@/types/finance";

export type AccountInput = Omit<Account, "id" | "icon" | "color" | "updated">;
export type IncomeInput = Omit<Income, "id">;
export type ExpenseInput = Omit<Expense, "id">;
export type AssetInput = Omit<Asset, "id">;
export type LiabilityInput = Omit<Liability, "id" | "remaining" | "status">;
export type GoalInput = { name: string; iconKey: string; target: number; current: number; date: string };
export type BudgetInput = { name: string; budget: number; spent?: number };
export type BillInput = {
  name: string;
  category: string;
  due: string;
  amount: number;
  iconKey: string;
  frequency?: string;
  account?: string;
  description?: string;
  reminderEnabled?: boolean;
  reminderDays?: number | string;
};

export type TransferInput = { from: string; to: string; amount: number; date: string; notes?: string };
export type InvestmentInput = {
  asset: string;
  account: string;
  amount: number;
  date: string;
  notes?: string;
  units?: number;
  pricePerUnit?: number;
};
/** Selling / withdrawing an investment: cash returns to a wallet. */
export type RedemptionInput = {
  asset: string;
  account: string;
  amount: number;
  date: string;
  units?: number;
  notes?: string;
};
/** A recurring contribution schedule (SIP, RD instalment, yearly deposit). */
export type SipInput = {
  asset: string;
  account: string;
  amount: number;
  frequency: string;
  nextDue: string;
  autoDebit?: boolean;
};
export type DividendInput = { source: string; account: string; amount: number; date: string };
export type RefundInput = { merchant: string; category: string; account: string; amount: number; date: string };
export type ContributionInput = { goal: string; account: string; to: string; amount: number; date: string };
export type EmiInput = {
  liability: string;
  account: string;
  amount: number;
  principal: number;
  interest: number;
  date: string;
};

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
  /** True while ANY finance query is in flight — drives the thin top bar only.
   *  No widget may gate its own rendering on this. */
  loading: boolean;
  totals: FinanceTotals;
  /** Server-side aggregates: the only valid source of financial totals. */
  summary: FinanceSummary;
  removeTransaction: (id: string) => void;
  accounts: Account[]; addAccount: (v: AccountInput) => void; updateAccount: (id: string, v: AccountInput) => void; removeAccount: (id: string) => void;
  addIncome: (v: IncomeInput) => void; updateIncome: (id: string, v: IncomeInput) => void; removeIncome: (id: string) => void;
  addExpense: (v: ExpenseInput) => void; updateExpense: (id: string, v: ExpenseInput) => void; removeExpense: (id: string) => void;
  addTransfer: (v: TransferInput) => void;
  addInvestment: (v: InvestmentInput) => void;
  addRedemption: (v: RedemptionInput) => void;
  /** Scheduled contributions (SIP / RD / yearly). */
  contributions: InvestmentContribution[];
  addSip: (v: SipInput) => void;
  removeSip: (id: string) => void;
  /** Records one instalment as a real investment transaction and rolls the schedule. */
  recordSipContribution: (id: string, date?: string) => void;
  addDividend: (v: DividendInput) => void;
  addRefund: (v: RefundInput) => void;
  addEmiPayment: (v: EmiInput) => void;
  addGoalContribution: (v: ContributionInput) => void;
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
  // WRITES ONLY — the provider never downloads transaction history. Pages that
  // display a ledger mount useLedger(); the dashboard mounts
  // useRecentTransactions(10).
  const transactions = useTransactionMutations();
  const assetsData = useAssets();
  const liabilitiesData = useLiabilities();
  const goalsData = useGoals();
  const budgetsData = useBudgets();
  const billsData = useBills();
  const contributionsData = useInvestmentContributions();
  const notificationsData = useNotifications();

  // In-app bill reminders (deduplicated per bill occurrence).
  useBillReminders();

  // Every budget must be able to show ITS OWN period, so the aggregate window
  // is widened to cover all stored budget periods.
  const budgetPeriods = useMemo<MonthRef[]>(
    () => budgetsData.rows.map((b) => ({ year: b.period_year, month: b.period_month })),
    [budgetsData.rows],
  );
  const summary = useFinanceSummary({ extraMonths: budgetPeriods, trailingMonths: 12 });

  // Purely cosmetic top progress bar. Nothing gates rendering on this.
  const loading = useIsFetching() > 0;

  const walletRows = useMemo<Wallet[]>(() => wallets.rows, [wallets.rows]);
  const categoryRows = useMemo<Category[]>(() => categories.rows, [categories.rows]);

  const walletName = (id: string | null) => walletRows.find((w) => w.id === id)?.name ?? "—";
  const categoryName = (id: string | null) => categoryRows.find((c) => c.id === id)?.name ?? "Others";

  const accounts = useMemo(() => walletRows.map(toAccount), [walletRows]);

  const assets = useMemo(() => assetsData.rows.map(toAsset), [assetsData.rows]);
  const liabilities = useMemo(() => liabilitiesData.rows.map(toLiability), [liabilitiesData.rows]);
  const goals = useMemo(() => goalsData.rows.map(toGoal), [goalsData.rows]);
  const bills = useMemo(() => billsData.rows.map(toBill), [billsData.rows]);
  const notifications = useMemo(() => notificationsData.rows, [notificationsData.rows]);

  // Totals always describe the CURRENT IST month and come from the server-side
  // aggregate, never from the paginated transaction list.
  const totals = useMemo(
    () => computeTotals({ accounts, assets, liabilities, month: summary.metricsFor(summary.current) }),
    [accounts, assets, liabilities, summary.categoryRows, summary.isLoading, summary.current.year, summary.current.month],
  );

  // Budgets: the limit comes from the budgets table; "spent" is aggregated by
  // Postgres for the budget's OWN period_year / period_month — never for the
  // current month.
  const budgets = useMemo<Budget[]>(
    () =>
      budgetsData.rows.map((b) => {
        const name = b.name ?? categoryName(b.category_id);
        const period: MonthRef = { year: b.period_year, month: b.period_month };
        const rows = summary.categoryRows.filter(
          (r) =>
            Number(r.y) === period.year &&
            Number(r.m) === period.month &&
            (b.category_id
              ? r.category_id === b.category_id
              : (r.category_name ?? "").toLowerCase() === name.toLowerCase()),
        );
        const spent = rows.filter((r) => r.tx_type === "expense").reduce((s, r) => s + Number(r.total ?? 0), 0);
        const refunded = rows.filter((r) => r.tx_type === "refund").reduce((s, r) => s + Number(r.total ?? 0), 0);
        return {
          id: b.id,
          name,
          budget: Number(b.amount),
          spent: Math.max(0, spent - refunded),
          categoryId: b.category_id,
          periodYear: period.year,
          periodMonth: period.month,
          periodLabel: monthLongLabel(period),
        };
      }),
    [budgetsData.rows, summary.categoryRows, categoryRows],
  );

  /** Finds a category by name (creating it when missing) so records stay linked. */
  const resolveCategoryId = async (name: string, kind: CategoryKind): Promise<string | null> => {
    if (!name) return null;
    const cached = categoryRows.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && (c.kind === kind || c.kind === "both"),
    );
    if (cached) return cached.id;
    const category = await categoriesRepo.ensure(name, kind);
    await qc.invalidateQueries({ queryKey: financeKeys.categories });
    return category.id;
  };

  const resolveWalletId = (name?: string): string | null => {
    if (!name || name === "—") return null;
    const w = walletRows.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return w?.id ?? null;
  };

  const requireWalletId = (name: string, label: string): string => {
    const id = resolveWalletId(name);
    if (!id) throw new Error(`${label} account "${name}" was not found`);
    return id;
  };

  /** Runs an async payload builder and surfaces failures instead of swallowing them. */
  const run = (build: () => Promise<void>) => {
    void build().catch((e) => toast.error(errorMessage(e)));
  };

  /* ---------- UI input -> database payload mappers ---------- */

  // WALLET BALANCE AUTHORITY
  // A wallet's running balance is ledger-derived: opening_balance + every
  // transaction effect applied by the database trigger. Only creation sets a
  // balance (the opening balance); editing an account can never overwrite the
  // calculated balance.
  const walletCreatePayload = (v: AccountInput) => ({
    name: v.name,
    institution: v.bank,
    type: walletTypeFromLabel(v.type),
    icon: v.type,
    opening_balance: v.balance,
    balance: v.balance,
  });

  const walletUpdatePayload = (v: AccountInput) => ({
    name: v.name,
    institution: v.bank,
    type: walletTypeFromLabel(v.type),
    icon: v.type,
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

  const numOrNull = (v: unknown) => {
    const n = Number(v);
    return v === undefined || v === null || v === "" || !Number.isFinite(n) ? null : n;
  };

  const assetPayload = (v: AssetInput) => ({
    name: v.name,
    type: assetTypeFromLabel(v.type),
    purchase_value: v.purchase,
    current_value: v.current,
    purchase_date: v.date || todayISODate(),
    // Investment facet — only the fields the chosen instrument actually needs.
    units: numOrNull(v.units),
    last_price: numOrNull(v.lastPrice),
    interest_rate: numOrNull(v.rate),
    compounding: v.compounding || null,
    maturity_date: v.maturityDate || null,
    folio_number: v.folio || null,
    institution: v.institution || null,
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

  const billPayload = async (v: BillInput) => {
    const frequency = frequencyFromLabel(v.frequency ?? "Monthly");
    const days = Number(v.reminderDays ?? 3);
    return {
      name: v.name,
      amount: v.amount,
      due_date: dmyToISO(v.due),
      icon: v.iconKey,
      // Category display name is kept in notes (existing behaviour) while the
      // bill is also linked to the shared categories table.
      notes: v.category,
      category_id: await resolveCategoryId(v.category, "expense"),
      wallet_id: resolveWalletId(v.account),
      description: v.description || null,
      frequency,
      is_recurring: frequency !== "one_time",
      reminder_enabled: v.reminderEnabled ?? true,
      reminder_days_before: Number.isFinite(days) && days > 0 ? Math.round(days) : 3,
    };
  };

  const createTx = (values: Omit<TransactionInsert, "user_id">) => transactions.create.mutate(values);

  const saveBudget = async (v: BudgetInput, id?: string) => {
    const existing = id
      ? budgetsData.rows.find((b) => b.id === id)
      : budgetsData.rows.find((b) => (b.name ?? "").toLowerCase() === v.name.toLowerCase());
    const category_id = await resolveCategoryId(v.name, "expense");
    if (existing) {
      budgetsData.update.mutate({ id: existing.id, values: { name: v.name, amount: v.budget, category_id } });
      return;
    }
    // New budgets are created for the current INDIAN calendar month.
    const period = currentMonth();
    budgetsData.create.mutate({
      name: v.name,
      amount: v.budget,
      category_id,
      period_month: period.month,
      period_year: period.year,
    });
  };

  const value: Ctx = {
    loading,
    totals,
    summary,
    removeTransaction: (id) => transactions.remove.mutate(id),
    accounts, assets, liabilities, goals, budgets, bills, notifications,

    addAccount: (v) => wallets.create.mutate(walletCreatePayload(v)),
    updateAccount: (id, v) => wallets.update.mutate({ id, values: walletUpdatePayload(v) }),
    removeAccount: (id) => wallets.remove.mutate(id),

    addIncome: (v) => run(async () => createTx(await incomePayload(v))),
    updateIncome: (id, v) => run(async () => transactions.update.mutate({ id, values: await incomePayload(v) })),
    removeIncome: (id) => transactions.remove.mutate(id),

    addExpense: (v) => run(async () => createTx(await expensePayload(v))),
    updateExpense: (id, v) => run(async () => transactions.update.mutate({ id, values: await expensePayload(v) })),
    removeExpense: (id) => transactions.remove.mutate(id),

    // Transfer: one row, both legs. Never counted as income or expense.
    addTransfer: (v) =>
      run(async () => {
        const from = requireWalletId(v.from, "Source");
        const to = requireWalletId(v.to, "Destination");
        if (from === to) throw new Error("Source and destination must be different accounts");
        createTx({
          type: "transfer",
          amount: v.amount,
          transaction_date: v.date || todayISODate(),
          wallet_id: from,
          to_wallet_id: to,
          payee: v.to,
          notes: v.notes || null,
        });
      }),

    // Investment: cash leaves the wallet and lands in an existing asset.
    addInvestment: (v) =>
      run(async () => {
        const asset = assetsData.rows.find((a) => a.name.toLowerCase() === v.asset.toLowerCase());
        if (!asset) throw new Error(`Asset "${v.asset}" was not found`);
        createTx({
          type: "investment",
          amount: v.amount,
          transaction_date: v.date || todayISODate(),
          wallet_id: requireWalletId(v.account, "Source"),
          asset_id: asset.id,
          payee: v.asset,
          category_id: await resolveCategoryId("Investment", "expense"),
          notes: v.notes || null,
        } as Omit<TransactionInsert, "user_id">);
      }),

    addDividend: (v) =>
      run(async () =>
        createTx({
          type: "dividend",
          amount: v.amount,
          transaction_date: v.date || todayISODate(),
          wallet_id: requireWalletId(v.account, "Destination"),
          payee: v.source,
          category_id: await resolveCategoryId("Dividend", "income"),
        }),
      ),

    addRefund: (v) =>
      run(async () =>
        createTx({
          type: "refund",
          amount: v.amount,
          transaction_date: v.date || todayISODate(),
          wallet_id: requireWalletId(v.account, "Destination"),
          payee: v.merchant,
          category_id: await resolveCategoryId(v.category || "Refund", "expense"),
        }),
      ),

    // EMI: wallet -amount, liability -principal, interest recognised as expense.
    addEmiPayment: (v) =>
      run(async () => {
        const liability = liabilitiesData.rows.find((l) => l.name.toLowerCase() === v.liability.toLowerCase());
        if (!liability) throw new Error(`Liability "${v.liability}" was not found`);
        const interest = Number(v.interest || 0);
        const principal = Number(v.principal || Math.max(0, v.amount - interest));
        if (principal + interest > v.amount + 0.5) {
          throw new Error("Principal + interest cannot exceed the EMI amount");
        }
        createTx({
          type: "emi",
          amount: v.amount,
          transaction_date: v.date || todayISODate(),
          wallet_id: requireWalletId(v.account, "Source"),
          liability_id: liability.id,
          principal_amount: principal,
          interest_amount: interest,
          payee: v.liability,
          category_id: await resolveCategoryId("EMI", "expense"),
        } as Omit<TransactionInsert, "user_id">);
      }),

    // GOAL ACCOUNTING
    // A goal is an *allocation label*, not a place money goes to. A
    // contribution is therefore a real transfer between two real wallets
    // (e.g. HDFC Savings -> Emergency Fund savings account) tagged with
    // goal_id. The trigger debits the source, credits the destination and
    // raises the goal's saved amount — so net worth is unchanged and editing
    // or deleting the row reverses all three effects atomically.
    addGoalContribution: (v) =>
      run(async () => {
        const goal = goalsData.rows.find((g) => g.name.toLowerCase() === v.goal.toLowerCase());
        if (!goal) throw new Error(`Goal "${v.goal}" was not found`);
        const from = requireWalletId(v.account, "Source");
        const to = requireWalletId(v.to, "Destination");
        if (from === to) throw new Error("Choose a different account to hold the goal money");
        createTx({
          type: "transfer",
          amount: v.amount,
          transaction_date: v.date || todayISODate(),
          wallet_id: from,
          to_wallet_id: to,
          goal_id: goal.id,
          payee: v.goal,
          notes: "Goal contribution",
        } as Omit<TransactionInsert, "user_id">);
      }),

    addAsset: (v) => assetsData.create.mutate(assetPayload(v)),
    updateAsset: (id, v) => assetsData.update.mutate({ id, values: assetPayload(v) }),
    removeAsset: (id) => assetsData.remove.mutate(id),

    addLiability: (v) => liabilitiesData.create.mutate(liabilityPayload(v)),
    updateLiability: (id, v) => liabilitiesData.update.mutate({ id, values: liabilityPayload(v) }),
    removeLiability: (id) => liabilitiesData.remove.mutate(id),

    addGoal: (v) => goalsData.create.mutate(goalPayload(v)),
    updateGoal: (id, v) => goalsData.update.mutate({ id, values: goalPayload(v) }),
    removeGoal: (id) => goalsData.remove.mutate(id),

    addBudget: (v) => run(() => saveBudget(v)),
    updateBudget: (id, v) => run(() => saveBudget(v, id)),
    removeBudget: (id) => budgetsData.remove.mutate(id),

    addBill: (v) => run(async () => billsData.create.mutate(await billPayload(v))),
    updateBill: (id, v) => run(async () => billsData.update.mutate({ id, values: await billPayload(v) })),
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
