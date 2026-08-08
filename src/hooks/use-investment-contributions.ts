import { queryOptions, useQuery } from "@tanstack/react-query";
import { investmentContributionsRepo } from "@/repositories";
import { CACHE, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["investment_contributions"]["Row"];
type Insert = Database["public"]["Tables"]["investment_contributions"]["Insert"];
type Update = Database["public"]["Tables"]["investment_contributions"]["Update"];

export const investmentContributionsQueryOptions = queryOptions({
  queryKey: financeKeys.investmentContributions,
  queryFn: () => investmentContributionsRepo.listAll(),
  ...CACHE.medium,
});

export function useInvestmentContributions() {
  const query = useQuery(investmentContributionsQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<Insert, "user_id">) => investmentContributionsRepo.create(values),
    invalidate: [financeKeys.investmentContributions],
    success: "Contribution scheduled",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: Update }) =>
      investmentContributionsRepo.update(id, values),
    invalidate: [financeKeys.investmentContributions],
    success: "Schedule updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => investmentContributionsRepo.remove(id),
    invalidate: [financeKeys.investmentContributions],
    success: "Schedule removed",
  });

  return {
    rows: (query.data ?? []) as Row[],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    create,
    update,
    remove,
  };
}