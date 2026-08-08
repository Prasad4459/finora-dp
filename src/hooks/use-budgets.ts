import { queryOptions, useQuery } from "@tanstack/react-query";
import { budgetsRepo } from "@/repositories";
import { CACHE, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { BudgetInsert, BudgetUpdate } from "@/types/database";

export const budgetsQueryOptions = queryOptions({
  queryKey: financeKeys.budgets,
  queryFn: () => budgetsRepo.list({ orderBy: "created_at" }),
  ...CACHE.medium,
});

export function useBudgets() {
  const query = useQuery(budgetsQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<BudgetInsert, "user_id">) => budgetsRepo.create(values),
    invalidate: [financeKeys.budgets],
    success: "Budget saved",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: BudgetUpdate }) => budgetsRepo.update(id, values),
    invalidate: [financeKeys.budgets],
    success: "Budget saved",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => budgetsRepo.remove(id),
    invalidate: [financeKeys.budgets],
    success: "Budget removed",
  });

  return {
    rows: query.data ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(), create, update, remove };
}