import { useInfiniteQuery } from "@tanstack/react-query";
import { DEFAULT_PAGE_SIZE, transactionsRepo } from "@/repositories";
import { FINANCE_DERIVED_KEYS, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { TransactionInsert, TransactionUpdate } from "@/types/database";

/**
 * Paged transaction history — the browser never holds the full ledger.
 * Any transaction mutation invalidates every derived financial cache because
 * the database trigger also moved wallet / asset / liability / goal balances.
 */
export function useTransactions(pageSize = DEFAULT_PAGE_SIZE) {
  const query = useInfiniteQuery({
    queryKey: [...financeKeys.transactions, pageSize] as const,
    queryFn: ({ pageParam }) => transactionsRepo.page({ pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
  });

  const rows = (query.data?.pages ?? []).flatMap((p) => p.rows);

  const create = useEntityMutation({
    mutationFn: (values: Omit<TransactionInsert, "user_id">) => transactionsRepo.create(values),
    invalidate: FINANCE_DERIVED_KEYS,
    success: "Saved",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: TransactionUpdate }) => transactionsRepo.update(id, values),
    invalidate: FINANCE_DERIVED_KEYS,
    success: "Updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => transactionsRepo.remove(id),
    invalidate: FINANCE_DERIVED_KEYS,
    success: "Deleted",
  });

  return {
    rows,
    isLoading: query.isLoading,
    hasMore: !!query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => query.fetchNextPage(),
    create,
    update,
    remove,
  };
}
