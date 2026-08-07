import { queryOptions, useQuery } from "@tanstack/react-query";
import { transactionsRepo } from "@/repositories";
import { financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { TransactionInsert, TransactionUpdate } from "@/types/database";

export const transactionsQueryOptions = queryOptions({
  queryKey: financeKeys.transactions,
  queryFn: () => transactionsRepo.list({ orderBy: "transaction_date", limit: 500 }),
});

export function useTransactions() {
  const query = useQuery(transactionsQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<TransactionInsert, "user_id">) => transactionsRepo.create(values),
    invalidate: [financeKeys.transactions, financeKeys.budgets],
    success: "Saved",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: TransactionUpdate }) => transactionsRepo.update(id, values),
    invalidate: [financeKeys.transactions, financeKeys.budgets],
    success: "Updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => transactionsRepo.remove(id),
    invalidate: [financeKeys.transactions, financeKeys.budgets],
    success: "Deleted",
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}