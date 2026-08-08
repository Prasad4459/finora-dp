import { useQuery } from "@tanstack/react-query";
import { analyticsRepo, type CategoryMonthlyRow, type MonthlySummaryRow } from "@/repositories";
import {
  addMonths,
  currentMonth,
  maxMonth,
  minMonth,
  monthKeyOf,
  monthRange,
  todayISO,
  type MonthRef,
} from "@/lib/date-in";
import { financeKeys } from "./query-keys";
import {
  addAggregates,
  emptyMonthAggregate,
  monthMetrics,
  type MonthAggregate,
  type MonthMetrics,
} from "@/services/finance";

export type CategorySpend = {
  categoryId: string | null;
  name: string;
  expense: number;
  refund: number;
  /** expense − refund, floored at 0 for display purposes. */
  net: number;
};

/** Extra months the aggregate window must cover (e.g. budget periods). */
export type SummaryWindow = { extraMonths?: MonthRef[]; trailingMonths?: number };

function toAggregates(rows: MonthlySummaryRow[]): Map<string, MonthAggregate> {
  const map = new Map<string, MonthAggregate>();
  for (const r of rows) {
    const key = monthKeyOf({ year: Number(r.y), month: Number(r.m) });
    const agg = map.get(key) ?? emptyMonthAggregate(key);
    const total = Number(r.total ?? 0);
    switch (r.tx_type) {
      case "income": agg.income += total; break;
      case "dividend": agg.dividend += total; break;
      case "refund": agg.refund += total; break;
      case "expense": agg.expense += total; break;
      case "investment": agg.investment += total; break;
      case "transfer": agg.transfer += total; break;
      case "emi":
        agg.emi += total;
        agg.emiInterest += Number(r.interest_total ?? 0);
        agg.emiPrincipal += Number(r.principal_total ?? 0);
        break;
    }
    map.set(key, agg);
  }
  return map;
}

/**
 * Server-side financial aggregation.
 *
 * Every monetary total in Finora comes from here — Postgres groups the FULL
 * transaction history by IST calendar month, so the figures stay correct with
 * thousands of transactions. The paginated transaction list is for display
 * only and must never feed a total.
 */
export function useFinanceSummary(window: SummaryWindow = {}) {
  const trailing = window.trailingMonths ?? 12;
  const current = currentMonth();
  const jan = { year: current.year, month: 1 };
  const candidates = [current, jan, addMonths(current, -(trailing - 1)), ...(window.extraMonths ?? [])];
  const from = monthRange(minMonth(candidates)).from;
  const to = monthRange(maxMonth(candidates)).to;

  const summary = useQuery({
    queryKey: [...financeKeys.summary, from, to] as const,
    queryFn: () => analyticsRepo.summaryMonthly(from, to),
  });
  const categories = useQuery({
    queryKey: [...financeKeys.categorySummary, from, to] as const,
    queryFn: () => analyticsRepo.categoryMonthly(from, to),
  });

  const byMonth = toAggregates(summary.data ?? []);
  const categoryRows: CategoryMonthlyRow[] = categories.data ?? [];

  const aggregateFor = (ref: MonthRef): MonthAggregate =>
    byMonth.get(monthKeyOf(ref)) ?? emptyMonthAggregate(monthKeyOf(ref));

  const metricsFor = (ref: MonthRef): MonthMetrics => monthMetrics(aggregateFor(ref));

  /** 1 January .. today, in IST. */
  const ytd = (): MonthMetrics => {
    const months = Array.from({ length: current.month }, (_, i) => aggregateFor({ year: current.year, month: i + 1 }));
    return monthMetrics(addAggregates(months, `${current.year}-YTD`));
  };

  /** Oldest-first series of the last `count` months. */
  const series = (count: number): Array<{ ref: MonthRef; metrics: MonthMetrics }> =>
    Array.from({ length: count }, (_, i) => {
      const ref = addMonths(current, i - (count - 1));
      return { ref, metrics: metricsFor(ref) };
    });

  /** Category spend for one IST month, biggest first. */
  const categorySpend = (ref: MonthRef): CategorySpend[] => {
    const map = new Map<string, CategorySpend>();
    for (const r of categoryRows) {
      if (Number(r.y) !== ref.year || Number(r.m) !== ref.month) continue;
      if (r.tx_type !== "expense" && r.tx_type !== "refund") continue;
      const id = r.category_id ?? `name:${r.category_name}`;
      const entry = map.get(id) ?? { categoryId: r.category_id, name: r.category_name, expense: 0, refund: 0, net: 0 };
      if (r.tx_type === "expense") entry.expense += Number(r.total ?? 0);
      else entry.refund += Number(r.total ?? 0);
      entry.net = Math.max(0, entry.expense - entry.refund);
      map.set(id, entry);
    }
    return [...map.values()].filter((c) => c.expense > 0 || c.refund > 0).sort((a, b) => b.net - a.net);
  };

  return {
    isLoading: summary.isLoading || categories.isLoading,
    today: todayISO(),
    current,
    aggregateFor,
    metricsFor,
    ytd,
    series,
    categorySpend,
    /** Raw category rows — used by budgets to honour their own period. */
    categoryRows,
  };
}

export type FinanceSummary = ReturnType<typeof useFinanceSummary>;