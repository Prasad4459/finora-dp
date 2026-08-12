// Pure, React-free rules for the daily market-price refresh (Release 7C).
// It decides WHICH holdings may be repriced, WHETHER a fetched quote should be
// written, and HOW fresh a stored price is. No network, no Supabase, no React.
import { instrumentMeta, isValidPrice } from "@/services/instruments";

/** Price sources that a provider can actually refresh today. */
export const REFRESHABLE_SOURCES = ["amfi", "nse", "bse"] as const;
export type RefreshableSource = (typeof REFRESHABLE_SOURCES)[number];

export type RefreshableAsset = {
  id: string;
  name: string;
  type: string;
  units?: number | null;
  lastPrice?: number | null;
  lastPriceAt?: string | null;
  symbol?: string | null;
  exchange?: string | null;
  priceSource?: string | null;
};

export type PriceRequest = {
  id: string;
  name: string;
  symbol: string;
  exchange: string | null;
  source: RefreshableSource;
};

export type Quote = {
  id: string;
  price: number;
  /** ISO date (YYYY-MM-DD) the price is valid for. */
  asOf: string;
  source: RefreshableSource;
};

export type QuoteFailure = { id: string; reason: string };

/**
 * VALUATION SAFETY GATE.
 * Only market-valued, unit-bearing holdings with a real provider identifier are
 * ever repriced. FD/RD/PPF/NSC/bonds (accrual), property, vehicles, cash, bank
 * and anything left on `manual` can never reach a provider.
 */
export function isRefreshable(a: RefreshableAsset): boolean {
  const meta = instrumentMeta(a.type);
  if (meta.valuation !== "market" || !meta.units) return false;
  if (!(Number(a.units ?? 0) > 0)) return false;
  const source = String(a.priceSource ?? "manual").toLowerCase();
  if (!REFRESHABLE_SOURCES.includes(source as RefreshableSource)) return false;
  return Boolean(a.symbol && String(a.symbol).trim());
}

export function toPriceRequest(a: RefreshableAsset): PriceRequest {
  return {
    id: a.id,
    name: a.name,
    symbol: String(a.symbol).trim(),
    exchange: a.exchange ? String(a.exchange).trim().toUpperCase() : null,
    source: String(a.priceSource).toLowerCase() as RefreshableSource,
  };
}

export const buildRefreshQueue = (assets: RefreshableAsset[]): PriceRequest[] =>
  assets.filter(isRefreshable).map(toPriceRequest);

/**
 * HISTORY DE-DUPLICATION. A quote is only written when it is valid AND either
 * the price or the valuation date has moved — re-running the refresh twice in a
 * day never appends a second identical asset_valuations row.
 */
export function shouldApply(a: RefreshableAsset, q: { price: number; asOf: string }): boolean {
  if (!isValidPrice(q.price)) return false;
  const sameDay = (a.lastPriceAt ?? "").slice(0, 10) === q.asOf.slice(0, 10);
  const samePrice = Number(a.lastPrice ?? 0) === q.price;
  return !(sameDay && samePrice);
}

export type Freshness = {
  status: "today" | "yesterday" | "stale" | "unavailable";
  label: string;
};

const dayDiff = (fromISO: string, toISO: string) =>
  Math.round(
    (Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / 86_400_000,
  );

/** Never present a stale price as current. */
export function freshness(lastPriceAt: string | null | undefined, todayISO: string): Freshness {
  if (!lastPriceAt) return { status: "unavailable", label: "Price unavailable" };
  const day = String(lastPriceAt).slice(0, 10);
  const diff = dayDiff(day, todayISO);
  if (Number.isNaN(diff)) return { status: "unavailable", label: "Price unavailable" };
  if (diff <= 0) return { status: "today", label: "Updated today" };
  if (diff === 1) return { status: "yesterday", label: "Last updated yesterday" };
  return { status: "stale", label: `Last updated ${diff} days ago` };
}

/** Most recent valuation timestamp across a set of holdings. */
export const latestPricedAt = (assets: RefreshableAsset[]): string | null =>
  assets.reduce<string | null>(
    (best, a) => (a.lastPriceAt && (!best || a.lastPriceAt > best) ? a.lastPriceAt : best),
    null,
  );
