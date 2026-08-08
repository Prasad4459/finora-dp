import { queryOptions, useQuery } from "@tanstack/react-query";
import { transactionsRepo } from "@/repositories";
import { CACHE, financeKeys } from "./query-keys";

export const RECENT_TRANSACTION_LIMIT = 10;

/**
 * The ONLY transaction query the dashboard mounts: the newest N rows.
 * No aggregate may ever be derived from it — totals come from the server-side
 * summary RPCs.
 */
export const recentTransactionsQueryOptions = (limit = RECENT_TRANSACTION_LIMIT) =>
  queryOptions({
    queryKey: financeKeys.recentTransactions(limit),
    queryFn: () => transactionsRepo.recent(limit),
    ...CACHE.short,
  });

export function useRecentTransactions(limit = RECENT_TRANSACTION_LIMIT) {
  const query = useQuery(recentTransactionsQueryOptions(limit));
  return {
    rows: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}