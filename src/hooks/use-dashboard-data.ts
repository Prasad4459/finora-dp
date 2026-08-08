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

export function useBillsWidget() {
  const query = useQuery(billsQueryOptions);
  const bills = useMemo(() => (query.data ?? []).map(toBill), [query.data]);
  const total = useMemo(() => bills.reduce((s, b) => s + b.amount, 0), [bills]);
  return {
    bills,
    total,
    count: bills.length,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasData: query.data !== undefined,
    refetch: () => void query.refetch(),
  };
}