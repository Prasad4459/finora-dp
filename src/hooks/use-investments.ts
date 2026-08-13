import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { todayISO } from "@/lib/date-in";
import { buildPortfolio, classifyContributions } from "@/services/portfolio";
import { useFinance } from "@/store/finance-store";
import { assetsQueryOptions } from "./use-assets";

/**
 * Investment view-model. All maths lives in services/portfolio — this hook only
 * feeds it the already-cached assets and contribution schedules, so no extra
 * queries and no duplicated financial logic.
 */
export function useInvestments() {
  const f = useFinance();
  const today = todayISO();
  // Same cached query the store already mounts — read only for widget state,
  // so the page can show loading / error instead of a false ₹0.
  const assetsQuery = useQuery(assetsQueryOptions);

  const portfolio = useMemo(() => buildPortfolio(f.assets, today), [f.assets, today]);
  const schedules = useMemo(
    () => classifyContributions(f.contributions, today),
    [f.contributions, today],
  );

  return {
    portfolio,
    schedules,
    today,
    isLoading: assetsQuery.isLoading,
    isError: assetsQuery.isError,
    refetch: () => void assetsQuery.refetch(),
  };
}