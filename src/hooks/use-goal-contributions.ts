import { useQuery } from "@tanstack/react-query";
import { transactionsRepo } from "@/repositories";
import { CACHE, financeKeys } from "./query-keys";

/**
 * Contribution history for a single goal — read-only presentation of the
 * ledger rows that already carry this goal_id. Only mounted when the user
 * expands a goal's history.
 */
export function useGoalContributions(goalId: string | null) {
  const query = useQuery({
    queryKey: [...financeKeys.transactions, "goal", goalId] as const,
    queryFn: () => transactionsRepo.listByGoal(goalId as string),
    enabled: Boolean(goalId),
    ...CACHE.short,
  });

  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
