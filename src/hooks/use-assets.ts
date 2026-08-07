import { queryOptions, useQuery } from "@tanstack/react-query";
import { assetsRepo } from "@/repositories";
import { financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { AssetInsert, AssetUpdate } from "@/types/database";

export const assetsQueryOptions = queryOptions({
  queryKey: financeKeys.assets,
  queryFn: () => assetsRepo.listAll(),
});

export function useAssets() {
  const query = useQuery(assetsQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<AssetInsert, "user_id">) => assetsRepo.create(values),
    invalidate: [financeKeys.assets],
    success: "Asset added",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: AssetUpdate }) => assetsRepo.update(id, values),
    invalidate: [financeKeys.assets],
    success: "Asset updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => assetsRepo.remove(id),
    invalidate: [financeKeys.assets],
    success: "Asset deleted",
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}