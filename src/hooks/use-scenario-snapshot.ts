import { useMemo } from "react";
import { useFinance } from "@/store/finance-store";
import { emptySnapshot, type FinanceSnapshot } from "@/services/scenario-engine";

/**
 * READ-ONLY snapshot of the signed-in user's real position, assembled from the
 * data the app has already cached (RLS-scoped queries — no new access paths).
 * Nothing here writes; it only feeds the pure scenario engine.
 */
export function useScenarioSnapshot(): {
  snapshot: FinanceSnapshot;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  current: { year: number; month: number };
} {
  const f = useFinance();
  const { totals, summary, liabilities, goals } = f;

  const snapshot = useMemo<FinanceSnapshot>(() => {
    if (!summary.hasData) return { ...emptySnapshot(), liabilities: [], goals: [] };

    // Average the last 6 months that actually contain activity, so a partial
    // current month does not distort the monthly figures.
    const series = summary.series(6);
    const active = series.filter(
      (s) => s.metrics.grossIncome > 0 || s.metrics.cashOutflow > 0,
    );
    const used = active.length > 0 ? active : series.slice(-1);
    const avg = (pick: (m: (typeof used)[number]["metrics"]) => number) =>
      used.reduce((sum, s) => sum + pick(s.metrics), 0) / used.length;

    const monthlyIncome = avg((m) => m.grossIncome);
    const monthlyExpenses = avg((m) => m.consumptionExpense);
    const monthlyInvestment = avg((m) => m.investmentContribution);
    const monthlySurplus = avg((m) => m.savings);

    return {
      totalBalance: totals.totalBalance,
      totalAssets: totals.totalAssets,
      totalInvestments: totals.totalInvestments,
      totalDebt: totals.totalDebt,
      netWorth: totals.netWorth,
      monthlyIncome,
      monthlyExpenses,
      monthlyEmi: totals.monthlyEmi,
      monthlyInvestment,
      monthlySurplus,
      monthsOfHistory: used.length,
      liabilities: liabilities.map((l) => ({
        id: l.id,
        name: l.name,
        balance: l.balance,
        rate: l.rate,
        emi: l.emi,
        remainingMonths: l.remaining,
      })),
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        target: g.target,
        current: g.current,
        targetDate: g.date,
      })),
    };
  }, [totals, summary.hasData, summary.current.year, summary.current.month, summary.categoryRows, liabilities, goals]);

  return {
    snapshot,
    isLoading: summary.isLoading,
    isError: summary.isError,
    refetch: summary.refetch,
    current: summary.current,
  };
}