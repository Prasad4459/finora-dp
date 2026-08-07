import { queryOptions, useQuery } from "@tanstack/react-query";
import { goalsRepo } from "@/repositories";
import { financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { GoalInsert, GoalUpdate } from "@/types/database";

export const goalsQueryOptions = queryOptions({
  queryKey: financeKeys.goals,
  queryFn: () => goalsRepo.listActive(),
});

export function useGoals() {
  const query = useQuery(goalsQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<GoalInsert, "user_id">) => goalsRepo.create(values),
    invalidate: [financeKeys.goals],
    success: "Goal created",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: GoalUpdate }) => goalsRepo.update(id, values),
    invalidate: [financeKeys.goals],
    success: "Goal updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => goalsRepo.remove(id),
    invalidate: [financeKeys.goals],
    success: "Goal deleted",
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}