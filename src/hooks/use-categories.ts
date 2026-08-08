import { queryOptions, useQuery } from "@tanstack/react-query";
import { categoriesRepo } from "@/repositories";
import { CACHE, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { CategoryInsert } from "@/types/database";

export const categoriesQueryOptions = queryOptions({
  queryKey: financeKeys.categories,
  queryFn: () => categoriesRepo.listAll(),
  ...CACHE.long,
});

export function useCategories() {
  const query = useQuery(categoriesQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<CategoryInsert, "user_id">) => categoriesRepo.create(values),
    invalidate: [financeKeys.categories],
    success: "Category added",
  });

  return {
    rows: query.data ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(), create };
}