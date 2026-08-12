// Daily market-price refresh (Release 7C).
// Fetches EOD quotes through the server function (API key stays server-side),
// then writes each accepted price through the EXISTING assetsRepo.updatePrice —
// so last_price, last_price_at, current_value and asset_valuations always move
// together, and net worth follows the Release 7B single value path.
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { assetsRepo } from "@/repositories";
import { fetchMarketQuotes } from "@/lib/market-data.functions";
import { financeKeys } from "./query-keys";
import { buildRefreshQueue, shouldApply, type RefreshableAsset } from "@/services/market-refresh";

export type RefreshSummary = {
  updated: number;
  unchanged: number;
  unavailable: number;
  at: string;
};

export function usePriceRefresh(assets: RefreshableAsset[]) {
  const queryClient = useQueryClient();
  const fetchQuotes = useServerFn(fetchMarketQuotes);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<RefreshSummary | null>(null);

  const eligibleCount = buildRefreshQueue(assets).length;

  const refresh = useCallback(async () => {
    const queue = buildRefreshQueue(assets);
    if (queue.length === 0) {
      toast.info("No market-linked holdings to refresh", {
        description: "Add a scheme code or ticker and set its price source to AMFI, NSE or BSE.",
      });
      return;
    }
    setIsRefreshing(true);
    try {
      const { quotes, failures } = await fetchQuotes({ data: { items: queue } });
      const byId = new Map(assets.map((a) => [a.id, a]));
      let updated = 0;
      let unchanged = 0;
      let unavailable = failures.length;

      for (const q of quotes) {
        const asset = byId.get(q.id);
        if (!asset) continue;
        // Invalid prices and unchanged (price, date) pairs never write a row.
        if (!shouldApply(asset, q)) {
          unchanged += 1;
          continue;
        }
        try {
          await assetsRepo.updatePrice(q.id, {
            price: q.price,
            asOf: q.asOf,
            source: q.source,
            priceUnit: q.priceUnit ?? null,
          });
          updated += 1;
        } catch {
          // A rejected write keeps the last known good valuation.
          unavailable += 1;
        }
      }

      await queryClient.invalidateQueries({ queryKey: financeKeys.assets });
      setSummary({ updated, unchanged, unavailable, at: new Date().toISOString() });
      toast.success(`${updated} price${updated === 1 ? "" : "s"} updated`, {
        description: `${unchanged} already current · ${unavailable} unavailable`,
      });
    } catch (err) {
      toast.error("Price refresh failed", {
        description: err instanceof Error ? err.message : "Last known values were kept.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [assets, fetchQuotes, queryClient]);

  return { refresh, isRefreshing, summary, eligibleCount };
}
