import { useMemo } from "react";
import { useTransactionsPage } from "./use-transactions";
import { useEntityNames } from "./use-entity-names";
import { toTransactionView, type TransactionView } from "@/lib/transaction-view";
import { toExpense, toIncome } from "@/lib/finance-mappers";

/**
 * Paginated ledger for the Income / Expenses pages.
 *
 * Lives outside the finance store so that pages which do NOT show a ledger
 * (dashboard, accounts, goals, ...) never download transaction history.
 */
export function useLedger() {
  const page = useTransactionsPage();
  const { walletRows, categoryRows, walletName, categoryName } = useEntityNames();
  const txRows = page.rows;

  const ledger = useMemo<TransactionView[]>(
    () => txRows.map((t) => toTransactionView(t, { categoryName, walletName })),
    [txRows, categoryRows, walletRows],
  );

  // Income-side history: income, dividends and refunds are all inflows.
  const incomes = useMemo(
    () =>
      txRows
        .filter((t) => t.type === "income" || t.type === "dividend" || t.type === "refund")
        .map((t) => {
          const row = toIncome(t, categoryName(t.category_id), walletName(t.wallet_id));
          // txType is authoritative — no screen may infer meaning from the
          // category NAME.
          return t.type === "income"
            ? { ...row, txType: t.type }
            : { ...row, txType: t.type, category: t.type === "dividend" ? "Dividend" : row.category };
        }),
    [txRows, categoryRows, walletRows],
  );

  // Outflow-side history: expenses, EMI payments and investment purchases all
  // leave a wallet, so none of them may disappear from the list.
  const expenses = useMemo(
    () =>
      txRows
        .filter((t) => t.type === "expense" || t.type === "emi" || t.type === "investment")
        .map((t) => {
          const row = toExpense(t, categoryName(t.category_id), walletName(t.wallet_id));
          return t.type === "expense"
            ? row
            : { ...row, category: t.type === "emi" ? "EMI" : "Investment" };
        }),
    [txRows, categoryRows, walletRows],
  );

  return {
    transactions: ledger,
    incomes,
    expenses,
    isLoading: page.isLoading,
    isError: page.isError,
    error: page.error,
    refetch: page.refetch,
    hasMore: page.hasMore,
    isLoadingMore: page.isLoadingMore,
    loadMore: page.loadMore,
  };
}