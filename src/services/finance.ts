// Pure, React-free finance calculations. Everything here is testable in
// isolation and must never import components, hooks or the Supabase client.
import type { Account, Asset, Budget, Expense, Income, Liability } from "@/types/finance";

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** "YYYY-MM" for the current month in the user's locale time. */
export const currentMonthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const isInMonth = (isoDate: string, monthKey = currentMonthKey()) =>
  (isoDate ?? "").startsWith(monthKey);

export const sum = <T,>(list: T[], pick: (item: T) => number) =>
  list.reduce((total, item) => total + pick(item), 0);

/** Asset types treated as invested capital rather than physical holdings. */
export const INVESTMENT_ASSET_TYPES = ["Stocks", "Mutual Funds", "PPF", "EPF", "NPS", "Crypto", "FD"];

export type FinanceTotals = {
  totalBalance: number;
  totalAssets: number;
  totalInvestments: number;
  totalDebt: number;
  netWorth: number;
  monthIncome: number;
  monthExpenses: number;
  savingsRate: number;
  monthlyEmi: number;
};

export function computeTotals(input: {
  accounts: Account[];
  assets: Asset[];
  liabilities: Liability[];
  incomes: Income[];
  expenses: Expense[];
  monthKey?: string;
}): FinanceTotals {
  const monthKey = input.monthKey ?? currentMonthKey();
  const totalBalance = sum(input.accounts, (a) => a.balance);
  const totalAssets = sum(input.assets, (a) => a.current);
  const totalInvestments = sum(
    input.assets.filter((a) => INVESTMENT_ASSET_TYPES.includes(a.type)),
    (a) => a.current,
  );
  const totalDebt = sum(input.liabilities, (l) => l.balance);
  const monthIncome = sum(input.incomes.filter((i) => isInMonth(i.date, monthKey)), (i) => i.amount);
  const monthExpenses = sum(input.expenses.filter((e) => isInMonth(e.date, monthKey)), (e) => e.amount);
  const savingsRate = monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0;

  return {
    totalBalance,
    totalAssets,
    totalInvestments,
    totalDebt,
    netWorth: totalBalance + totalAssets - totalDebt,
    monthIncome,
    monthExpenses,
    savingsRate,
    monthlyEmi: sum(input.liabilities, (l) => l.emi),
  };
}

/**
 * 0–100 financial health score built from savings rate, debt load and how many
 * months of expenses the liquid balance covers.
 */
export function computeHealthScore(t: FinanceTotals): { score: number; label: string; runwayMonths: number } {
  const savingsPoints = Math.max(0, Math.min(40, Math.round((t.savingsRate / 50) * 40)));
  const debtRatio = t.totalAssets + t.totalBalance > 0 ? t.totalDebt / (t.totalAssets + t.totalBalance) : 1;
  const debtPoints = Math.max(0, Math.min(30, Math.round((1 - debtRatio) * 30)));
  const runwayMonths = t.monthExpenses > 0 ? t.totalBalance / t.monthExpenses : 0;
  const runwayPoints = Math.max(0, Math.min(30, Math.round((runwayMonths / 6) * 30)));
  const score = Math.max(0, Math.min(100, savingsPoints + debtPoints + runwayPoints));
  const label = score >= 75 ? "Strong" : score >= 50 ? "Good" : score >= 30 ? "Fair" : "Needs work";
  return { score, label, runwayMonths: Number(runwayMonths.toFixed(1)) };
}

export const budgetProgress = (b: Budget) => ({
  pct: b.budget > 0 ? Math.min(Math.round((b.spent / b.budget) * 100), 130) : 0,
  over: b.spent > b.budget,
});
