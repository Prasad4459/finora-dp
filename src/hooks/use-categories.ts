import { queryOptions, useQuery } from "@tanstack/react-query";
import { categoriesRepo } from "@/repositories";
import { financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { CategoryInsert } from "@/types/database";

export const categoriesQueryOptions = queryOptions({
  queryKey: financeKeys.categories,
  queryFn: () => categoriesRepo.listAll(),
});

export function useCategories() {
  const query = useQuery(categoriesQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<CategoryInsert, "user_id">) => categoriesRepo.create(values),
    invalidate: [financeKeys.categories],
    success: "Category added",
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, create };
}