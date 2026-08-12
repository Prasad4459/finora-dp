// Pure, React-free "market awareness" layer for Ask Finora (Release 7D).
//
// RULES ENCODED HERE:
//  • Current value ALWAYS comes from assetCurrentValue() — the same single
//    source the Investments page and the net-worth engine use. This module
//    never invents a second valuation model and never invents a price.
//  • A market valuation change is NEVER income and NEVER a transaction. It is
//    only the difference between two recorded valuations of the same holding.
//  • With fewer than two recorded valuations there is NO change to report.
//    We say so explicitly instead of guessing a previous price.
import type { Asset } from "@/types/finance";
import { assetCurrentValue, gainOf, instrumentMeta } from "@/services/instruments";

/** One recorded valuation row (from public.asset_valuations). */
export type ValuationPoint = {
  assetId: string;
  /** ISO "YYYY-MM-DD". */
  asOf: string;
  value: number;
};

export type MarketHolding = {
  assetId: string;
  name: string;
  type: string;
  symbol: string | null;
  exchange: string | null;
  priceSource: string;
  units: number | null;
  /** Price / NAV per unit actually recorded. Null when never priced. */
  price: number | null;
  invested: number;
  /** Derived by assetCurrentValue — the single source of current value. */
  value: number;
  /** Unrealised gain/loss = value − invested. Never income. */
  gain: number;
  gainPct: number;
  lastPriceAt: string | null;
  latestValuationDate: string | null;
  latestValuationValue: number | null;
  previousValuationDate: string | null;
  previousValuationValue: number | null;
  /** latest − previous valuation. Null when there is no previous valuation. */
  valuationChange: number | null;
  /** True only when the latest valuation was recorded today (IST). */
  changeIsToday: boolean;
};

export type MarketContext = {
  holdings: MarketHolding[];
  /** Holdings that are market-valued but have no second valuation yet. */
  withoutPreviousValuation: string[];
  invested: number;
  value: number;
  gain: number;
  gainPct: number;
  /** Sum of per-holding valuation changes, over holdings that HAVE one. */
  valuationChange: number | null;
  /** Same, restricted to valuations recorded today (IST). */
  valuationChangeToday: number | null;
  best: MarketHolding | null;
  worst: MarketHolding | null;
  hasMarketData: boolean;
};

/** Market-valued instruments only (stocks, MFs, ETFs, gold, crypto, NPS…). */
export const isMarketValued = (a: Asset) => {
  const meta = instrumentMeta(a.type);
  return meta.investment && meta.valuation === "market";
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Valuations for one asset, newest first. */
function sortedFor(assetId: string, valuations: ValuationPoint[]): ValuationPoint[] {
  return valuations
    .filter((v) => v.assetId === assetId && Number.isFinite(v.value))
    .slice()
    .sort((a, b) => (a.asOf < b.asOf ? 1 : a.asOf > b.asOf ? -1 : 0));
}

export function buildMarketHolding(
  a: Asset,
  valuations: ValuationPoint[],
  todayISO: string,
): MarketHolding {
  const value = assetCurrentValue(a, todayISO);
  const invested = a.purchase;
  const { gain, pct } = gainOf(value, invested);
  const history = sortedFor(a.id, valuations);
  const latest = history[0] ?? null;
  const previous = history[1] ?? null;
  const change = latest && previous ? round2(latest.value - previous.value) : null;

  return {
    assetId: a.id,
    name: a.name,
    type: a.type,
    symbol: a.symbol ?? null,
    exchange: a.exchange ?? null,
    priceSource: a.priceSource ?? "manual",
    units: a.units ?? null,
    price: a.lastPrice ?? null,
    invested,
    value,
    gain: round2(gain),
    gainPct: round2(pct),
    lastPriceAt: a.lastPriceAt ?? null,
    latestValuationDate: latest?.asOf ?? null,
    latestValuationValue: latest ? round2(latest.value) : null,
    previousValuationDate: previous?.asOf ?? null,
    previousValuationValue: previous ? round2(previous.value) : null,
    valuationChange: change,
    changeIsToday: Boolean(latest && previous && latest.asOf.slice(0, 10) === todayISO),
  };
}

export function buildMarketContext(
  assets: Asset[],
  valuations: ValuationPoint[],
  todayISO: string,
): MarketContext {
  const holdings = assets
    .filter((a) => isMarketValued(a) && a.isActive !== false)
    .map((a) => buildMarketHolding(a, valuations, todayISO))
    .filter((h) => h.value > 0 || h.invested > 0)
    .sort((a, b) => b.value - a.value);

  const invested = round2(holdings.reduce((s, h) => s + h.invested, 0));
  const value = round2(holdings.reduce((s, h) => s + h.value, 0));
  const { gain, pct } = gainOf(value, invested);

  const withChange = holdings.filter((h) => h.valuationChange !== null);
  const todayChange = withChange.filter((h) => h.changeIsToday);

  const ranked = holdings.slice().sort((a, b) => b.gainPct - a.gainPct);

  return {
    holdings,
    withoutPreviousValuation: holdings.filter((h) => h.valuationChange === null).map((h) => h.name),
    invested,
    value,
    gain: round2(gain),
    gainPct: round2(pct),
    valuationChange: withChange.length
      ? round2(withChange.reduce((s, h) => s + (h.valuationChange ?? 0), 0))
      : null,
    valuationChangeToday: todayChange.length
      ? round2(todayChange.reduce((s, h) => s + (h.valuationChange ?? 0), 0))
      : null,
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    hasMarketData: holdings.length > 0,
  };
}
