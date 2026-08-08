// Pure, React-free finance calculations — the single place where Finora's
// financial vocabulary is defined. Never imports components, hooks or Supabase.
//
// FINANCIAL DEFINITIONS (all figures for one IST calendar month)
//   grossIncome           = income + dividends
//   refunds               = money returned for an earlier outflow
//   consumptionExpense    = expenses + EMI interest − refunds
//                           (EMI principal repays debt and an investment buys
//                            an asset: neither is consumption)
//   cashOutflow           = expenses + investments + full EMI − refunds
//   investmentContribution= cash moved from wallets into investment assets
//   savings / cashRetained= grossIncome − cashOutflow
//                           (identical to income + dividends + refunds −
//                            gross outflow: a refund is counted exactly once)
//   savingsRate           = savings ÷ grossIncome × 100, may be negative
//   transfers (incl. goal contributions) are never income or expense.
import type { Account, Asset, Budget, Liability } from "@/types/finance";
import { currentMonthKey, isInMonth, todayISO } from "@/lib/date-in";

export { currentMonthKey, isInMonth, todayISO };

export const sum = <T,>(list: T[], pick: (item: T) => number) =>
  list.reduce((total, item) => total + pick(item), 0);

const safeDiv = (numerator: number, denominator: number) =>
  denominator > 0 && Number.isFinite(numerator / denominator) ? numerator / denominator : 0;

/** Asset types treated as invested capital rather than physical holdings. */
export const INVESTMENT_ASSET_TYPES = ["Stocks", "Mutual Funds", "PPF", "EPF", "NPS", "Crypto", "FD"];

/**
 * Asset types that mirror money already tracked by a wallet. Counting them in
 * net worth on top of wallet balances would double-count the same rupees.
 */
export const WALLET_MIRRORED_ASSET_TYPES = ["Cash", "Bank"];

/**
 * NET-WORTH AUTHORITY RULE (prevents double counting)
 * ---------------------------------------------------
 * One financial value has exactly one authoritative home:
 *  • Invested capital  -> the `assets` table. Wallets of type
 *    "Investment Account" mirror the same holdings, so they are excluded from
 *    net worth (they may still be used as a transaction source/destination).
 *  • Debt              -> the `liabilities` table. "Loan Account" wallets
 *    mirror a liability, so they are excluded too.
 *  • Liquid cash       -> wallets (bank / cash / UPI / credit card). Asset
 *    rows of type Cash or Bank mirror wallets and are excluded from assets.
 */
export const NON_NET_WORTH_ACCOUNT_TYPES = ["Investment Account", "Loan Account"];

export const isNetWorthAccount = (a: Account) => !NON_NET_WORTH_ACCOUNT_TYPES.includes(a.type);

/** Raw per-month totals as aggregated by Postgres (never by the browser). */
export type MonthAggregate = {
  key: string;
  income: number;
  dividend: number;
  refund: number;
  expense: number;
  investment: number;
  emi: number;
  emiInterest: number;
  emiPrincipal: number;
  transfer: number;
};

export const emptyMonthAggregate = (key = currentMonthKey()): MonthAggregate => ({
  key,
  income: 0,
  dividend: 0,
  refund: 0,
  expense: 0,
  investment: 0,
  emi: 0,
  emiInterest: 0,
  emiPrincipal: 0,
  transfer: 0,
});

export type MonthMetrics = {
  key: string;
  grossIncome: number;
  refunds: number;
  consumptionExpense: number;
  cashOutflow: number;
  investmentContribution: number;
  savings: number;
  savingsRate: number;
  emiPaid: number;
  emiInterest: number;
  emiPrincipal: number;
  transfers: number;
};

/** Turns one month of raw totals into Finora's documented financial metrics. */
export function monthMetrics(a: MonthAggregate): MonthMetrics {
  const grossIncome = a.income + a.dividend;
  const refunds = a.refund;
  // Not clamped at zero: a month where refunds exceed spending is genuinely
  // net-negative consumption and the refund must not silently disappear.
  const consumptionExpense = a.expense + a.emiInterest - refunds;
  const cashOutflow = a.expense + a.investment + a.emi - refunds;
  const savings = grossIncome - cashOutflow;
  const savingsRate =
    grossIncome > 0
      ? Math.round(safeDiv(savings, grossIncome) * 100)
      : savings < 0
        ? -100 // no income at all but money went out: worst possible rate
        : 0;
  return {
    key: a.key,
    grossIncome,
    refunds,
    consumptionExpense,
    cashOutflow,
    investmentContribution: a.investment,
    savings,
    savingsRate,
    emiPaid: a.emi,
    emiInterest: a.emiInterest,
    emiPrincipal: a.emiPrincipal,
    transfers: a.transfer,
  };
}

/** Adds several months together (used for YTD and multi-month averages). */
export function addAggregates(list: MonthAggregate[], key = "range"): MonthAggregate {
  return list.reduce<MonthAggregate>(
    (acc, m) => ({
      key,
      income: acc.income + m.income,
      dividend: acc.dividend + m.dividend,
      refund: acc.refund + m.refund,
      expense: acc.expense + m.expense,
      investment: acc.investment + m.investment,
      emi: acc.emi + m.emi,
      emiInterest: acc.emiInterest + m.emiInterest,
      emiPrincipal: acc.emiPrincipal + m.emiPrincipal,
      transfer: acc.transfer + m.transfer,
    }),
    emptyMonthAggregate(key),
  );
}

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
  monthInvested: number;
  monthSavings: number;
  monthCashOutflow: number;
  monthRefunds: number;
};

export function computeTotals(input: {
  accounts: Account[];
  assets: Asset[];
  liabilities: Liability[];
  /** Server-aggregated metrics for the month being shown. */
  month: MonthMetrics;
}): FinanceTotals {
  // Only wallets that are the authoritative home of their value (see
  // NET-WORTH AUTHORITY RULE above) contribute to the liquid balance.
  const totalBalance = sum(input.accounts.filter(isNetWorthAccount), (a) => a.balance);
  // Wallet-mirrored assets (plain cash / bank holdings) are excluded so the
  // same money is not counted twice in net worth.
  const netWorthAssets = input.assets.filter((a) => !WALLET_MIRRORED_ASSET_TYPES.includes(a.type));
  const totalAssets = sum(netWorthAssets, (a) => a.current);
  const totalInvestments = sum(
    input.assets.filter((a) => INVESTMENT_ASSET_TYPES.includes(a.type)),
    (a) => a.current,
  );
  const totalDebt = sum(input.liabilities, (l) => l.balance);
  const month = input.month;

  return {
    totalBalance,
    totalAssets,
    totalInvestments,
    totalDebt,
    // Net worth = (liquid balances + non-mirrored assets) − liabilities.
    netWorth: totalBalance + totalAssets - totalDebt,
    monthIncome: month.grossIncome,
    monthExpenses: month.consumptionExpense,
    savingsRate: month.savingsRate,
    monthlyEmi: sum(input.liabilities, (l) => l.emi),
    monthInvested: month.investmentContribution,
    monthSavings: month.savings,
    monthCashOutflow: month.cashOutflow,
    monthRefunds: month.refunds,
  };
}

/** One scored component of the health score. */
export type HealthPillar = {
  key: "savings" | "debt" | "emergency";
  label: string;
  points: number;
  max: number;
  /** points ÷ max × 100 — how well this single area is doing. */
  pct: number;
  detail: string;
};

export type HealthScore = {
  score: number;
  label: string;
  runwayMonths: number;
  pillars: HealthPillar[];
  strongest: HealthPillar;
  weakest: HealthPillar;
  /** Share of assets + balance that is invested — informational, not scored. */
  investedShare: number;
  /** True when there is simply not enough data for the score to mean anything. */
  insufficientData: boolean;
};

/**
 * 0–100 financial health score built from savings rate, debt load and how many
 * months of expenses the liquid balance covers. The weights are unchanged
 * (40 / 30 / 30) — they are only surfaced per area so the score is explainable.
 */
export function computeHealthScore(t: FinanceTotals): HealthScore {
  const savingsPoints = Math.max(0, Math.min(40, Math.round((t.savingsRate / 50) * 40)));
  const base = t.totalAssets + t.totalBalance;
  const debtRatio = base > 0 ? safeDiv(t.totalDebt, base) : t.totalDebt > 0 ? 1 : 0;
  const debtPoints = Math.max(0, Math.min(30, Math.round((1 - debtRatio) * 30)));
  const runwayMonths = t.monthExpenses > 0 ? safeDiv(t.totalBalance, t.monthExpenses) : 0;
  const runwayPoints = Math.max(0, Math.min(30, Math.round((runwayMonths / 6) * 30)));
  const score = Math.max(0, Math.min(100, savingsPoints + debtPoints + runwayPoints));
  const label = score >= 75 ? "Strong" : score >= 50 ? "Good" : score >= 30 ? "Fair" : "Needs work";

  const pillars: HealthPillar[] = [
    {
      key: "savings",
      label: "Savings health",
      points: savingsPoints,
      max: 40,
      pct: Math.round((savingsPoints / 40) * 100),
      detail: `${t.savingsRate}% savings rate this month`,
    },
    {
      key: "debt",
      label: "Debt health",
      points: debtPoints,
      max: 30,
      pct: Math.round((debtPoints / 30) * 100),
      detail:
        base > 0
          ? `Debt is ${Math.round(debtRatio * 100)}% of what you own`
          : t.totalDebt > 0
            ? "Debt with no recorded assets"
            : "No debt recorded",
    },
    {
      key: "emergency",
      label: "Emergency fund",
      points: runwayPoints,
      max: 30,
      pct: Math.round((runwayPoints / 30) * 100),
      detail:
        t.monthExpenses > 0
          ? `${runwayMonths.toFixed(1)} months of expenses covered`
          : "No expenses recorded to measure runway",
    },
  ];

  const ranked = [...pillars].sort((a, b) => b.pct - a.pct);
  const ownedBase = t.totalAssets + t.totalBalance;

  return {
    score,
    label,
    runwayMonths: Number(runwayMonths.toFixed(1)),
    pillars,
    strongest: ranked[0],
    weakest: ranked[ranked.length - 1],
    investedShare: ownedBase > 0 ? Math.round(safeDiv(t.totalInvestments, ownedBase) * 100) : 0,
    // Nothing owned, owed, earned or spent — a score would be meaningless.
    insufficientData:
      ownedBase === 0 && t.totalDebt === 0 && t.monthIncome === 0 && t.monthExpenses === 0,
  };
}

/** Guarded against a zero / missing budget so it can never produce NaN. */
export const budgetProgress = (b: Budget) => ({
  pct: b.budget > 0 ? Math.max(0, Math.min(Math.round(safeDiv(b.spent, b.budget) * 100), 130)) : 0,
  over: b.budget > 0 ? b.spent > b.budget : b.spent > 0,
});

export const percentOf = (part: number, whole: number) => Math.round(safeDiv(part, whole) * 100);

/**
 * How much net worth a month created:
 *   cash retained + capital invested + debt principal repaid.
 * Used to reconstruct the historical net-worth curve backwards from today's
 * authoritative balance (we never store net-worth snapshots).
 */
export const netWorthChange = (m: MonthMetrics) =>
  m.savings + m.investmentContribution + m.emiPrincipal;
