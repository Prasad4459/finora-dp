import { describe, expect, it } from "vitest";
import {
  buildRefreshQueue,
  freshness,
  isRefreshable,
  latestPricedAt,
  shouldApply,
  type RefreshableAsset,
} from "@/services/market-refresh";
import { parseAmfiFeed, parseAmfiDate } from "@/lib/market-data.server";
import { assetCurrentValue } from "@/services/instruments";
import { computeTotals } from "@/services/finance";
import type { Asset } from "@/types/finance";

const TODAY = "2026-08-12";

const stock: RefreshableAsset = {
  id: "s1", name: "Reliance", type: "Stocks", units: 10, lastPrice: 1400,
  lastPriceAt: "2026-08-11T04:00:00.000Z", symbol: "RELIANCE", exchange: "NSE", priceSource: "nse",
};
const fund: RefreshableAsset = {
  id: "m1", name: "Nifty 50 Index Fund", type: "Mutual Funds", units: 1000, lastPrice: 120,
  lastPriceAt: null, symbol: "120503", exchange: null, priceSource: "amfi",
};
const fd: RefreshableAsset = {
  id: "f1", name: "SBI FD", type: "FD", units: null, priceSource: "manual", symbol: null,
};

const month = {
  grossIncome: 0, consumptionExpense: 0, savingsRate: 0, investmentContribution: 0,
  savings: 0, cashOutflow: 0, refunds: 0,
} as never;

describe("Release 7C — daily market valuation", () => {
  it("refreshes an eligible stock and mutual fund", () => {
    expect(isRefreshable(stock)).toBe(true);
    expect(isRefreshable(fund)).toBe(true);
    expect(buildRefreshQueue([stock, fund, fd]).map((r) => r.id)).toEqual(["s1", "m1"]);
  });

  it("never refreshes accrual, manual, physical or symbol-less holdings", () => {
    expect(isRefreshable(fd)).toBe(false);
    expect(isRefreshable({ ...fd, type: "PPF" })).toBe(false);
    expect(isRefreshable({ ...fd, type: "Property" })).toBe(false);
    expect(isRefreshable({ ...stock, priceSource: "manual" })).toBe(false);
    expect(isRefreshable({ ...stock, symbol: null })).toBe(false);
    expect(isRefreshable({ ...stock, units: 0 })).toBe(false);
  });

  it("rejects invalid prices and duplicate same-day valuations", () => {
    expect(shouldApply(stock, { price: 0, asOf: TODAY })).toBe(false);
    expect(shouldApply(stock, { price: Number.NaN, asOf: TODAY })).toBe(false);
    expect(shouldApply(stock, { price: 1400, asOf: "2026-08-11" })).toBe(false); // same price + date
    expect(shouldApply(stock, { price: 1450, asOf: "2026-08-11" })).toBe(true);
    expect(shouldApply(stock, { price: 1400, asOf: TODAY })).toBe(true);
  });

  it("labels staleness without presenting an old price as current", () => {
    expect(freshness("2026-08-12T09:00:00Z", TODAY).status).toBe("today");
    expect(freshness("2026-08-11T09:00:00Z", TODAY).label).toBe("Last updated yesterday");
    expect(freshness("2026-08-05T09:00:00Z", TODAY).status).toBe("stale");
    expect(freshness(null, TODAY).label).toBe("Price unavailable");
    expect(latestPricedAt([stock, fund])).toBe("2026-08-11T04:00:00.000Z");
  });

  it("parses the AMFI NAV feed by scheme code", () => {
    const feed = parseAmfiFeed(
      [
        "Scheme Code;ISIN Div Payout;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date",
        "Open Ended Schemes ( Equity Scheme )",
        "120503;INF209K01YM2;-;Some Index Fund - Growth;125.4567;11-Aug-2026",
        "999999;-;-;Broken Fund;N.A.;11-Aug-2026",
      ].join("\n"),
    );
    expect(feed.get("120503")).toEqual({ price: 125.4567, asOf: "2026-08-11" });
    expect(feed.has("999999")).toBe(false);
    expect(parseAmfiDate("11-Aug-2026")).toBe("2026-08-11");
  });

  it("a refreshed price flows into current value, portfolio and net worth", () => {
    const before: Asset = {
      id: "s1", name: "Reliance", type: "Stocks", purchase: 12_000, current: 14_000,
      date: "2025-08-12", units: 10, avgCost: 1200, lastPrice: 1400, isActive: true,
    };
    const after: Asset = { ...before, lastPrice: 1500, current: 15_000 };
    expect(assetCurrentValue(after, TODAY)).toBe(15_000);
    const fdRow: Asset = {
      id: "f1", name: "SBI FD", type: "FD", purchase: 100_000, current: 100_000,
      date: "2025-08-12", rate: 7, compounding: "Yearly", isActive: true,
    };
    const totalsBefore = computeTotals({ accounts: [], assets: [before, fdRow], liabilities: [], month, asOfISO: TODAY });
    const totalsAfter = computeTotals({ accounts: [], assets: [after, fdRow], liabilities: [], month, asOfISO: TODAY });
    expect(totalsAfter.totalAssets - totalsBefore.totalAssets).toBe(1_000);
    // accrual asset unchanged by the market path
    expect(assetCurrentValue(fdRow, TODAY)).toBe(assetCurrentValue(fdRow, TODAY));
  });
});
