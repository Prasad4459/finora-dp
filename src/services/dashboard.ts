// Pure, React-free shaping of dashboard chart data. Contains NO financial
// definitions of its own — every rupee figure comes from src/services/finance.ts
// (the engine) or the server-side aggregates.
import type { MonthRef } from "@/lib/date-in";
import { monthShortLabel } from "@/lib/date-in";
import { netWorthChange, type MonthMetrics } from "@/services/finance";

export type MonthSeries = Array<{ ref: MonthRef; metrics: MonthMetrics }>;

export type CashFlowPoint = { month: string; income: number; expense: number; savings: number };
export type NetWorthPoint = { month: string; value: number };
export type BreakdownSlice = { name: string; value: number; color: string };

export const buildCashFlowSeries = (series: MonthSeries): CashFlowPoint[] =>
  series.map(({ ref, metrics }) => ({
    month: monthShortLabel(ref),
    income: metrics.grossIncome,
    expense: metrics.consumptionExpense,
    savings: metrics.savings,
  }));

/**
 * Net worth is only known for today, so the curve is reconstructed backwards
 * by removing each month's net-worth change.
 */
export function buildNetWorthSeries(series: MonthSeries, netWorth: number): NetWorthPoint[] {
  const points: NetWorthPoint[] = [];
  let running = netWorth;
  for (let i = series.length - 1; i >= 0; i--) {
    points.unshift({ month: monthShortLabel(series[i].ref), value: Math.round(running) });
    running -= netWorthChange(series[i].metrics);
  }
  return points;
}

export function buildBreakdown(
  spend: Array<{ name: string; net: number }>,
  colors: readonly string[],
  take = 6,
): BreakdownSlice[] {
  return spend.slice(0, take).map((c, i) => ({
    name: c.name,
    value: c.net,
    color: colors[i % colors.length],
  }));
}

/** Total of a breakdown — computed once instead of per rendered row. */
export const breakdownTotal = (slices: BreakdownSlice[]) =>
  slices.reduce((s, c) => s + c.value, 0);

/**
 * Month-over-month change as a percentage. Returns null when the previous
 * month has nothing to compare against — a percentage off zero is meaningless.
 */
export const changePct = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;