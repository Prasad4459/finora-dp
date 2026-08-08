import { useInfiniteQuery } from "@tanstack/react-query";
import { DEFAULT_PAGE_SIZE, transactionsRepo } from "@/repositories";
import { CACHE, keysForTransaction, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { TransactionInsert, TransactionUpdate } from "@/types/database";

/**
 * Transaction WRITES only — no query is mounted, so a screen that merely needs
 * to create/edit/delete (every dialog in the app) never downloads history.
 *
 * Invalidation is narrowed to the caches the database trigger can actually
 * move for that transaction type (see keysForTransaction).
 */
export function useTransactionMutations() {
  const create = useEntityMutation({
    mutationFn: (values: Omit<TransactionInsert, "user_id">) => transactionsRepo.create(values),
    invalidate: (values) => keysForTransaction(values.type),
    success: "Saved",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: TransactionUpdate }) =>
      transactionsRepo.update(id, values),
    invalidate: ({ values }) => keysForTransaction(values.type),
    success: "Updated",
  });
  const remove = useEntityMutation({
    // The type of a deleted row is unknown here, so stay maximally correct.
    mutationFn: (id: string) => transactionsRepo.remove(id),
    invalidate: () => keysForTransaction(null),
    success: "Deleted",
  });

  return { create, update, remove };
}

/**
 * Paged transaction history for the Income / Expenses ledger pages.
 * The browser never holds the full ledger, and the dashboard never mounts this
 * query — it uses useRecentTransactions(10) instead.
 */
export function useTransactionsPage(pageSize = DEFAULT_PAGE_SIZE) {
  const query = useInfiniteQuery({
    queryKey: [...financeKeys.transactions, "page", pageSize] as const,
    queryFn: ({ pageParam }) => transactionsRepo.page({ pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
    ...CACHE.short,
  });

  const rows = (query.data?.pages ?? []).flatMap((p) => p.rows);
  const mutations = useTransactionMutations();

  return {
    rows,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    hasMore: !!query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => query.fetchNextPage(),
    ...mutations,
  };
}
