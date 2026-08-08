import { useQuery } from "@tanstack/react-query";
import { walletsQueryOptions } from "./use-wallets";
import { categoriesQueryOptions } from "./use-categories";

/**
 * Wallet / category name lookups backed by the shared reference caches.
 * Mounting this never costs an extra request — both queries are already used
 * by the finance store.
 */
export function useEntityNames() {
  const wallets = useQuery(walletsQueryOptions);
  const categories = useQuery(categoriesQueryOptions);
  const walletRows = wallets.data ?? [];
  const categoryRows = categories.data ?? [];

  return {
    walletRows,
    categoryRows,
    walletName: (id: string | null) => walletRows.find((w) => w.id === id)?.name ?? "—",
    categoryName: (id: string | null) => categoryRows.find((c) => c.id === id)?.name ?? "Others",
  };
}