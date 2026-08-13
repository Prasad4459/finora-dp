// Per-widget data access for the dashboard.
//
// Each hook mounts ONLY the queries its widget renders and exposes its own
// { isLoading, isError, error, refetch, hasData } so one slow or failing
// source can never blank the whole page. All of them read the same centralised
// query keys, so mounting several hooks costs no extra network requests.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { walletsQueryOptions } from "./use-wallets";
import { assetsQueryOptions } from "./use-assets";
import { liabilitiesQueryOptions } from "./use-liabilities";
import { goalsQueryOptions } from "./use-goals";
import { billsQueryOptions } from "./use-bills";
import { useRecentTransactions } from "./use-recent-transactions";
import { useEntityNames } from "./use-entity-names";
import { useFinance } from "@/store/finance-store";
import { computeTotals, type FinanceTotals } from "@/services/finance";
import { toAccount, toAsset, toBill, toGoal, toIncome, toLiability } from "@/lib/finance-mappers";
import { toTransactionView, type TransactionView } from "@/lib/transaction-view";
import { classifyBills, type BillInput, type ClassifiedBill } from "@/services/bills";
import { addMonths, todayISO } from "@/lib/date-in";
import type { MonthMetrics } from "@/services/finance";
import { buildPortfolio } from "@/services/portfolio";

/** Uniform status shape every dashboard widget consumes. */
export type WidgetStatus = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** Data has actually loaded — the difference between "zero" and "unknown". */
  hasData: boolean;
  refetch: () => void;
};

/**
 * Balance-sheet totals: wallets + assets + liabilities combined with the
 * server-side monthly aggregate through the finance engine (computeTotals).
 * No financial arithmetic happens in components.
 */
export function useBalanceSheet(): WidgetStatus & {
  totals: FinanceTotals;
  accountCount: number;
  liabilityCount: number;
} {
  const { summary } = useFinance();
  const wallets = useQuery(walletsQueryOptions);
  const assets = useQuery(assetsQueryOptions);
  const liabilities = useQuery(liabilitiesQueryOptions);

  const totals = useMemo(
    () =>
      computeTotals({
        accounts: (wallets.data ?? []).map(toAccount),
        assets: (assets.data ?? []).map(toAsset),
        liabilities: (liabilities.data ?? []).map(toLiability),
        month: summary.metricsFor(summary.current),
      }),
    [
      wallets.data,
      assets.data,
      liabilities.data,
      summary.categoryRows,
      summary.isLoading,
      summary.current.year,
      summary.current.month,
    ],
  );

  return {
    totals,
    accountCount: wallets.data?.length ?? 0,
    liabilityCount: liabilities.data?.length ?? 0,
    isLoading: wallets.isLoading || assets.isLoading || liabilities.isLoading || summary.isLoading,
    isError: wallets.isError || assets.isError || liabilities.isError || summary.isError,
    error: wallets.error ?? assets.error ?? liabilities.error ?? summary.error,
    hasData:
      wallets.data !== undefined &&
      assets.data !== undefined &&
      liabilities.data !== undefined &&
      summary.hasData,
    refetch: () => {
      void wallets.refetch();
      void assets.refetch();
      void liabilities.refetch();
      summary.refetch();
    },
  };
}

/** Server-side monthly aggregates — charts and month figures. */
export function useSummaryWidget() {
  const { summary } = useFinance();
  return summary;
}

/**
 * The dashboard's ONLY transaction query: the 10 newest rows.
 * Never used for any total.
 */
export function useRecentActivity(): WidgetStatus & {
  transactions: TransactionView[];
  incomes: ReturnType<typeof toIncome>[];
} {
  const recent = useRecentTransactions();
  const { walletRows, categoryRows, walletName, categoryName } = useEntityNames();
  const rows = recent.rows;

  const transactions = useMemo(
    () => (rows ?? []).map((t) => toTransactionView(t, { categoryName, walletName })),
    [rows, walletRows, categoryRows],
  );

  const incomes = useMemo(
    () =>
      (rows ?? [])
        .filter((t) => t.type === "income" || t.type === "dividend" || t.type === "refund")
        .map((t) => {
          const row = toIncome(t, categoryName(t.category_id), walletName(t.wallet_id));
          return t.type === "income"
            ? row
            : { ...row, category: t.type === "dividend" ? "Dividend" : "Refund" };
        }),
    [rows, walletRows, categoryRows],
  );

  return {
    transactions,
    incomes,
    isLoading: recent.isLoading,
    isError: recent.isError,
    error: recent.error,
    hasData: rows !== undefined,
    refetch: recent.refetch,
  };
}

export function useGoalsWidget() {
  const query = useQuery(goalsQueryOptions);
  const goals = useMemo(() => (query.data ?? []).map(toGoal), [query.data]);
  return {
    goals,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasData: query.data !== undefined,
    refetch: () => void query.refetch(),
  };
}

/**
 * Portfolio view for the dashboard hero. Reuses the same assets query and the
 * same portfolio maths as /investments — no new financial logic here.
 */
export function useInvestmentsWidget() {
  const query = useQuery(assetsQueryOptions);
  const portfolio = useMemo(
    () => buildPortfolio((query.data ?? []).map(toAsset), todayISO()),
    [query.data],
  );
  return {
    portfolio,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasData: query.data !== undefined,
    refetch: () => void query.refetch(),
  };
}

function useGoalsWidgetLegacy() {
  const query = useQuery(goalsQueryOptions);
  const goals = useMemo(() => (query.data ?? []).map(toGoal), [query.data]);
  return {
    goals,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasData: query.data !== undefined,
    refetch: () => void query.refetch(),
  };
}

export function useBillsWidget() {
  const query = useQuery(billsQueryOptions);
  const outlook = useMemo(() => {
    const rows = (query.data ?? []).map((row) => {
      const bill = toBill(row);
      return {
        id: bill.id,
        name: bill.name,
        category: bill.category,
        icon: bill.icon,
        amount: bill.amount,
        // toBill() formats the date for display; classification needs the ISO one.
        dueISO: (row.due_date ?? "").slice(0, 10),
        status: row.status,
      };
    });
    return classifyBills(rows, todayISO());
  }, [query.data]);

  return {
    /** Only genuinely upcoming bills: overdue, due today, or due within 14 days. */
    bills: outlook.upcoming,
    outlook,
    total: outlook.total,
    count: outlook.count,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasData: query.data !== undefined,
    refetch: () => void query.refetch(),
  };
}

export type DashboardBill = ClassifiedBill<BillInput & { name: string; category: string; icon: ReturnType<typeof toBill>["icon"] }>;

/**
 * Current vs previous IST month, straight from the server-side aggregates.
 * Components never subtract months themselves.
 */
export function useMonthComparison(): {
  month: MonthMetrics;
  previousMonth: MonthMetrics;
} {
  const { summary } = useFinance();
  const current = summary.current;
  return useMemo(
    () => ({
      month: summary.metricsFor(current),
      previousMonth: summary.metricsFor(addMonths(current, -1)),
    }),
    [summary.categoryRows, summary.isLoading, current.year, current.month],
  );
}

/**
 * Whether the user has recorded anything at all. Drives the getting-started
 * experience instead of a wall of ₹0 and empty charts.
 */
export function useOnboardingState() {
  const wallets = useQuery(walletsQueryOptions);
  const assets = useQuery(assetsQueryOptions);
  const liabilities = useQuery(liabilitiesQueryOptions);
  const goals = useQuery(goalsQueryOptions);
  const recent = useRecentTransactions();

  const resolved =
    wallets.data !== undefined &&
    assets.data !== undefined &&
    liabilities.data !== undefined &&
    goals.data !== undefined &&
    recent.rows !== undefined;

  const counts = {
    wallets: wallets.data?.length ?? 0,
    assets: assets.data?.length ?? 0,
    liabilities: liabilities.data?.length ?? 0,
    goals: goals.data?.length ?? 0,
    transactions: recent.rows?.length ?? 0,
  };

  return {
    counts,
    isLoading: !resolved && (wallets.isLoading || recent.isLoading),
    isError: wallets.isError || assets.isError || liabilities.isError || goals.isError || recent.isError,
    /** Nothing recorded anywhere yet. */
    isNewUser:
      resolved && Object.values(counts).every((n) => n === 0),
  };
}