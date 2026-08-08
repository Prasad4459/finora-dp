// Pure, React-free portfolio maths for the Investments domain.
//
// RULES ENCODED HERE (nothing in a component may re-derive them):
//  • Invested cost and current value are separate quantities. A new SIP
//    purchase raises invested cost; it never overwrites appreciation.
//  • Unrealised gain = current value − invested cost. It is NEVER income.
//  • Accrued interest on FD/PPF/NSC… raises displayed value only; interest
//    actually credited to a bank account is a real dividend/income row.
//  • Redemption proceeds are not income; only the realised gain is
//    performance (proceeds − proportional cost basis).
import type { Asset, InvestmentContribution } from "@/types/finance";
import {
  ASSET_CLASS_LABEL,
  derivedValue,
  gainOf,
  instrumentMeta,
  type AssetClass,
} from "@/services/instruments";
import { daysBetweenISO } from "@/services/bills";

export type Holding = Asset & {
  /** Displayed value: market (units × price), accrual or stored value. */
  value: number;
  invested: number;
  gain: number;
  gainPct: number;
  assetClass: AssetClass;
  className: string;
  /** Days until maturity (negative = matured). Null when not applicable. */
  daysToMaturity: number | null;
};

export type AllocationSlice = {
  key: AssetClass;
  label: string;
  value: number;
  pct: number;
  count: number;
};

export type Portfolio = {
  holdings: Holding[];
  /** Fully redeemed holdings, kept for history. */
  closed: Holding[];
  value: number;
  invested: number;
  gain: number;
  gainPct: number;
  allocation: AllocationSlice[];
  /** Holdings with a maturity date, soonest first. */
  maturing: Holding[];
};

/** True when an asset row represents invested capital (not a house or car). */
export const isInvestment = (a: Asset) => instrumentMeta(a.type).investment;

export function toHolding(a: Asset, todayISO: string): Holding {
  const meta = instrumentMeta(a.type);
  const value = derivedValue(
    {
      type: a.type,
      purchase: a.purchase,
      current: a.current,
      date: a.date,
      units: a.units,
      lastPrice: a.lastPrice,
      rate: a.rate,
      compounding: a.compounding,
      maturityDate: a.maturityDate,
    },
    todayISO,
  );
  const invested = a.purchase;
  const { gain, pct } = gainOf(value, invested);
  return {
    ...a,
    value,
    invested,
    gain,
    gainPct: pct,
    assetClass: meta.assetClass,
    className: ASSET_CLASS_LABEL[meta.assetClass],
    daysToMaturity: a.maturityDate ? daysBetweenISO(todayISO, a.maturityDate) : null,
  };
}

export function buildPortfolio(assets: Asset[], todayISO: string): Portfolio {
  const all = assets.filter(isInvestment).map((a) => toHolding(a, todayISO));
  const holdings = all.filter((h) => h.isActive !== false && (h.value > 0 || h.invested > 0));
  const closed = all.filter((h) => !holdings.includes(h));

  const value = holdings.reduce((s, h) => s + h.value, 0);
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const { gain, pct } = gainOf(value, invested);

  const byClass = new Map<AssetClass, AllocationSlice>();
  holdings.forEach((h) => {
    const slice = byClass.get(h.assetClass) ?? {
      key: h.assetClass,
      label: h.className,
      value: 0,
      pct: 0,
      count: 0,
    };
    slice.value += h.value;
    slice.count += 1;
    byClass.set(h.assetClass, slice);
  });
  const allocation = [...byClass.values()]
    .map((s) => ({ ...s, pct: value > 0 ? (s.value / value) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  return {
    holdings: holdings.sort((a, b) => b.value - a.value),
    closed,
    value,
    invested,
    gain,
    gainPct: pct,
    allocation,
    maturing: holdings
      .filter((h) => h.daysToMaturity !== null)
      .sort((a, b) => (a.daysToMaturity ?? 0) - (b.daysToMaturity ?? 0)),
  };
}

export type ScheduledContribution = InvestmentContribution & {
  daysUntil: number;
  isDue: boolean;
};

/** Active schedules ordered by next due date; the schedule stays the source of
 *  truth — no future transactions are ever materialised. */
export function classifyContributions(
  rows: InvestmentContribution[],
  todayISO: string,
): { active: ScheduledContribution[]; monthlyOutflow: number; dueCount: number } {
  const active = rows
    .filter((c) => c.status === "active")
    .map((c) => {
      const daysUntil = daysBetweenISO(todayISO, c.nextDueISO);
      return { ...c, daysUntil, isDue: daysUntil <= 0 };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const perMonth: Record<string, number> = {
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    half_yearly: 1 / 6,
    yearly: 1 / 12,
    one_time: 0,
  };
  return {
    active,
    monthlyOutflow: Math.round(
      active.reduce((s, c) => s + c.amount * (perMonth[c.frequency] ?? 0), 0),
    ),
    dueCount: active.filter((c) => c.isDue).length,
  };
}

/** Realised gain on a partial sale: proceeds − (units sold × average cost). */
export const realisedGain = (proceeds: number, unitsSold: number, avgCost: number | null) =>
  avgCost && unitsSold ? proceeds - unitsSold * avgCost : 0;