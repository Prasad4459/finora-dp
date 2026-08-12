import { queryOptions, useQuery } from "@tanstack/react-query";
import { assetsRepo } from "@/repositories";
import type { PriceUpdate } from "@/repositories/assets.repo";
import { CACHE, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { AssetInsert, AssetUpdate } from "@/types/database";

export const assetsQueryOptions = queryOptions({
  queryKey: financeKeys.assets,
  queryFn: () => assetsRepo.listAll(),
  ...CACHE.medium,
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
  // Intentional price update: writes last_price + last_price_at and appends a
  // valuation-history row. Invalid prices are rejected by the repository.
  const updatePrice = useEntityMutation({
    mutationFn: ({ id, update }: { id: string; update: PriceUpdate }) =>
      assetsRepo.updatePrice(id, update),
    invalidate: [financeKeys.assets],
    success: "Valuation updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => assetsRepo.remove(id),
    invalidate: [financeKeys.assets],
    success: "Asset deleted",
  });

  return {
    rows: query.data ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(), create, update, updatePrice, remove };
}