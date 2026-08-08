import { queryOptions, useQuery } from "@tanstack/react-query";
import { liabilitiesRepo } from "@/repositories";
import { CACHE, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { LiabilityInsert, LiabilityUpdate } from "@/types/database";

export const liabilitiesQueryOptions = queryOptions({
  queryKey: financeKeys.liabilities,
  queryFn: () => liabilitiesRepo.listActive(),
  ...CACHE.medium,
});

export function useLiabilities() {
  const query = useQuery(liabilitiesQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<LiabilityInsert, "user_id">) => liabilitiesRepo.create(values),
    invalidate: [financeKeys.liabilities],
    success: "Liability added",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: LiabilityUpdate }) => liabilitiesRepo.update(id, values),
    invalidate: [financeKeys.liabilities],
    success: "Liability updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => liabilitiesRepo.remove(id),
    invalidate: [financeKeys.liabilities],
    success: "Liability deleted",
  });

  return {
    rows: query.data ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(), create, update, remove };
}