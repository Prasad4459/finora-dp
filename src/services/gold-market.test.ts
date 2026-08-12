import { beforeEach, describe, expect, it, vi } from "vitest";
import { allowedSourcesFor, buildRefreshQueue, isRefreshable, shouldApply } from "@/services/market-refresh";
import { assetCurrentValue } from "@/services/instruments";
import { computeTotals } from "@/services/finance";
import { fetchQuotes, goldPerGram, GRAMS_PER_TROY_OUNCE } from "@/lib/market-data.server";
import type { Asset } from "@/types/finance";

const TODAY = "2026-08-12";

const month = {
  grossIncome: 0, consumptionExpense: 0, savingsRate: 0, investmentContribution: 0,
  savings: 0, cashOutflow: 0, refunds: 0,
} as never;

const gold = (over = {}) => ({
  id: "g1", name: "Physical gold", type: "Gold", units: 50, lastPrice: 11_000,
  lastPriceAt: "2026-08-11T04:00:00.000Z", symbol: null, exchange: null,
  priceSource: "gold_inr", priceUnit: "per_gram", ...over,
});

describe("Release 7E-2 — gold / digital gold market valuation", () => {
  it("Gold and Digital Gold are eligible for gold_inr without a ticker", () => {
    expect(isRefreshable(gold())).toBe(true);
    expect(isRefreshable(gold({ id: "d1", type: "Digital Gold", name: "SafeGold" }))).toBe(true);
    expect(buildRefreshQueue([gold()])[0]).toMatchObject({ id: "g1", source: "gold_inr", symbol: "" });
  });

  it("gold_inr can never reach ETFs, funds, silver or SGBs", () => {
    expect(isRefreshable(gold({ type: "Gold ETF", priceUnit: "per_unit", symbol: "GOLDBEES" }))).toBe(false);
    expect(isRefreshable(gold({ type: "Gold Fund", priceUnit: "per_unit", symbol: "120503" }))).toBe(false);
    expect(isRefreshable(gold({ type: "Silver" }))).toBe(false);
    expect(isRefreshable(gold({ type: "Sovereign Gold Bond", priceUnit: "per_unit" }))).toBe(false);
    expect(allowedSourcesFor("Gold")).toEqual(["gold_inr"]);
    expect(allowedSourcesFor("Digital Gold")).toEqual(["gold_inr"]);
    expect(allowedSourcesFor("Gold ETF")).toEqual(["nse", "bse"]);
    expect(allowedSourcesFor("Gold Fund")).toEqual(["amfi"]);
    expect(allowedSourcesFor("Silver")).toEqual([]);
    expect(allowedSourcesFor("Sovereign Gold Bond")).toEqual([]);
    // an equity source still cannot reach physical gold
    expect(isRefreshable(gold({ priceSource: "nse", symbol: "GOLD" }))).toBe(false);
  });

  it("enforces per_gram quotes and de-duplicates unchanged refreshes", () => {
    expect(shouldApply(gold(), { price: 11_500, asOf: TODAY, priceUnit: "per_gram" })).toBe(true);
    expect(shouldApply(gold(), { price: 11_000, asOf: "2026-08-11", priceUnit: "per_gram" })).toBe(false);
    expect(shouldApply(gold(), { price: 11_500, asOf: TODAY, priceUnit: "per_unit" })).toBe(false);
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(shouldApply(gold(), { price: bad, asOf: TODAY, priceUnit: "per_gram" })).toBe(false);
    }
  });

  it("converts XAU/USD x USD/INR into a 24K ₹/gram reference", () => {
    const out = goldPerGram({ price: 2000, asOf: "2026-08-12" }, { price: 87.5, asOf: "2026-08-11" });
    expect(out.price).toBeCloseTo((2000 * 87.5) / GRAMS_PER_TROY_OUNCE, 2);
    expect(out.asOf).toBe("2026-08-11");
    expect(() => goldPerGram({ price: 0, asOf: TODAY }, { price: 87.5, asOf: TODAY })).toThrow();
  });

  describe("provider adapter (mocked, never a real API call)", () => {
    const req = [{ id: "g1", name: "Gold", symbol: "", exchange: null, source: "gold_inr" as const }];

    beforeEach(() => {
      process.env["TWELVE_DATA_API_KEY"] = "test-key";
      vi.restoreAllMocks();
    });

    const mockFetch = (impl: (url: string) => unknown) =>
      vi.stubGlobal("fetch", vi.fn(async (input: URL | string) => {
        const url = String(input);
        const body = impl(url);
        if (body instanceof Error) throw body;
        return { ok: true, json: async () => body } as Response;
      }));

    it("returns a valid per_gram quote", async () => {
      mockFetch((url) =>
        url.includes("XAU") ? { close: "2000", datetime: "2026-08-12" } : { close: "87.5", datetime: "2026-08-12" },
      );
      const { quotes, failures } = await fetchQuotes(req);
      expect(failures).toEqual([]);
      expect(quotes[0]).toMatchObject({ id: "g1", source: "gold_inr", priceUnit: "per_gram", asOf: "2026-08-12" });
      expect(quotes[0].price).toBeCloseTo(5626.38, 1);
    });

    it("rejects malformed / invalid provider prices", async () => {
      mockFetch((url) => (url.includes("XAU") ? { close: "not-a-number" } : { close: "87.5" }));
      const { quotes, failures } = await fetchQuotes(req);
      expect(quotes).toEqual([]);
      expect(failures[0].id).toBe("g1");
    });

    it("degrades to a failure on timeout / network error", async () => {
      mockFetch(() => new Error("The operation was aborted due to timeout"));
      const { quotes, failures } = await fetchQuotes(req);
      expect(quotes).toEqual([]);
      expect(failures).toHaveLength(1);
    });

    it("reports a missing provider key instead of inventing a price", async () => {
      delete process.env["TWELVE_DATA_API_KEY"];
      const { quotes, failures } = await fetchQuotes(req);
      expect(quotes).toEqual([]);
      expect(failures[0].reason).toMatch(/not configured/);
    });
  });

  it("keeps the last good value and moves net worth only on an accepted price", () => {
    const holding = (price: number): Asset => ({
      id: "g1", name: "Physical gold", type: "Gold", purchase: 500_000,
      current: Math.round(50 * price), date: "2025-08-12", units: 50, avgCost: 10_000,
      lastPrice: price, isActive: true, priceUnit: "per_gram",
    });
    // a failed refresh writes nothing: the stored valuation survives
    expect(assetCurrentValue(holding(11_000), TODAY)).toBe(550_000);
    const before = computeTotals({ accounts: [], assets: [holding(11_000)], liabilities: [], month, asOfISO: TODAY });
    const after = computeTotals({ accounts: [], assets: [holding(11_500)], liabilities: [], month, asOfISO: TODAY });
    expect(before.netWorth).toBe(550_000);
    expect(after.netWorth).toBe(575_000);
  });
});
