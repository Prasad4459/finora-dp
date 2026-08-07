import { queryOptions, useQuery } from "@tanstack/react-query";
import { liabilitiesRepo } from "@/repositories";
import { financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { LiabilityInsert, LiabilityUpdate } from "@/types/database";

export const liabilitiesQueryOptions = queryOptions({
  queryKey: financeKeys.liabilities,
  queryFn: () => liabilitiesRepo.listActive(),
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

  return { rows: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}