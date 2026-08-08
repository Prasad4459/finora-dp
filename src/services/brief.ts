// Deterministic Daily Financial Brief.
//
// Every sentence here is derived from figures the finance engine already
// produced (src/services/finance.ts + the server-side monthly aggregates).
// No AI, no estimates, no invented numbers: if a figure is not known, the
// insight is simply not generated.
import { formatINR } from "@/lib/format";
import { netWorthChange, type FinanceTotals, type MonthMetrics } from "@/services/finance";
import type { BillInput, ClassifiedBill } from "@/services/bills";
import type { Goal } from "@/types/finance";

export type InsightTone = "positive" | "warning" | "neutral";
export type Insight = { id: string; tone: InsightTone; text: string };

const pctChange = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

export type BriefInput = {
  totals: FinanceTotals;
  month: MonthMetrics;
  previousMonth: MonthMetrics;
  nextBill: (ClassifiedBill<BillInput> & { name: string }) | null;
  goals: Goal[];
  /** True when the underlying queries have actually resolved. */
  hasData: boolean;
};

/** Net worth created this month by the ledger (savings + investing + principal). */
export const monthNetWorthChange = (m: MonthMetrics) => netWorthChange(m);

export function buildInsights(input: BriefInput): Insight[] {
  if (!input.hasData) return [];
  const { totals, month, previousMonth, nextBill, goals } = input;
  const out: Insight[] = [];

  if (month.savings > 0) {
    out.push({
      id: "savings",
      tone: "positive",
      text: `You're on track to save ${formatINR(month.savings)} this month.`,
    });
  } else if (month.cashOutflow > 0 && month.savings < 0) {
    out.push({
      id: "savings",
      tone: "warning",
      text: `You've spent ${formatINR(Math.abs(month.savings))} more than you earned this month.`,
    });
  }

  const spendChange = pctChange(month.consumptionExpense, previousMonth.consumptionExpense);
  if (spendChange !== null && Math.abs(spendChange) >= 1) {
    out.push({
      id: "spend-mom",
      tone: spendChange < 0 ? "positive" : "warning",
      text:
        spendChange < 0
          ? `Your spending is ${Math.abs(spendChange)}% lower than last month.`
          : `Your spending is ${spendChange}% higher than last month.`,
    });
  }

  if (nextBill) {
    const when =
      nextBill.daysUntil < 0
        ? `is ${Math.abs(nextBill.daysUntil)} day${Math.abs(nextBill.daysUntil) === 1 ? "" : "s"} overdue`
        : nextBill.daysUntil === 0
          ? "is due today"
          : `is due in ${nextBill.daysUntil} day${nextBill.daysUntil === 1 ? "" : "s"}`;
    out.push({
      id: "bill",
      tone: nextBill.daysUntil <= 0 ? "warning" : "neutral",
      text: `Your ${nextBill.name} bill of ${formatINR(nextBill.amount)} ${when}.`,
    });
  }

  const nwChange = monthNetWorthChange(month);
  if (Math.round(nwChange) !== 0) {
    out.push({
      id: "net-worth",
      tone: nwChange > 0 ? "positive" : "warning",
      text:
        nwChange > 0
          ? `Your net worth increased by ${formatINR(nwChange)} this month.`
          : `Your net worth decreased by ${formatINR(Math.abs(nwChange))} this month.`,
    });
  }

  const closest = goals
    .filter((g) => g.target > 0 && g.current < g.target)
    .sort((a, b) => b.current / b.target - a.current / a.target)[0];
  if (closest) {
    out.push({
      id: "goal",
      tone: "neutral",
      text: `${closest.name} is ${Math.round((closest.current / closest.target) * 100)}% funded — ${formatINR(
        closest.target - closest.current,
      )} to go.`,
    });
  }

  if (totals.monthlyEmi > 0) {
    out.push({
      id: "emi",
      tone: "neutral",
      text: `${formatINR(totals.monthlyEmi)} of EMIs are committed each month.`,
    });
  }

  return out.slice(0, 4);
}
