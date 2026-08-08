import { useMemo } from "react";
import { todayISO } from "@/lib/date-in";
import { buildPortfolio, classifyContributions } from "@/services/portfolio";
import { useFinance } from "@/store/finance-store";

/**
 * Investment view-model. All maths lives in services/portfolio — this hook only
 * feeds it the already-cached assets and contribution schedules, so no extra
 * queries and no duplicated financial logic.
 */
export function useInvestments() {
  const f = useFinance();
  const today = todayISO();

  const portfolio = useMemo(() => buildPortfolio(f.assets, today), [f.assets, today]);
  const schedules = useMemo(
    () => classifyContributions(f.contributions, today),
    [f.contributions, today],
  );

  return { portfolio, schedules, today };
}