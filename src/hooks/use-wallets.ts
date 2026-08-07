import { queryOptions, useQuery } from "@tanstack/react-query";
import { walletsRepo } from "@/repositories";
import { financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { WalletInsert, WalletUpdate } from "@/types/database";

export const walletsQueryOptions = queryOptions({
  queryKey: financeKeys.wallets,
  queryFn: () => walletsRepo.listActive(),
});

export function useWallets() {
  const query = useQuery(walletsQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<WalletInsert, "user_id">) => walletsRepo.create(values),
    invalidate: [financeKeys.wallets],
    success: "Account added",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: WalletUpdate }) => walletsRepo.update(id, values),
    invalidate: [financeKeys.wallets],
    success: "Account updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => walletsRepo.remove(id),
    invalidate: [financeKeys.wallets],
    success: "Account deleted",
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}