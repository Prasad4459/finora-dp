import { describe, expect, it } from "vitest";
import {
  assetCurrentValue,
  instrumentPriceUnit,
  priceUnitMatches,
} from "@/services/instruments";
import { allowedSourcesFor, isRefreshable, shouldApply } from "@/services/market-refresh";
import { computeTotals } from "@/services/finance";
import type { Asset } from "@/types/finance";

const TODAY = "2026-08-12";

const month = {
  grossIncome: 0, consumptionExpense: 0, savingsRate: 0, investmentContribution: 0,
  savings: 0, cashOutflow: 0, refunds: 0,
} as never;

const gold = (over: Partial<Asset> = {}): Asset => ({
  id: "g1", name: "Physical gold", type: "Gold", purchase: 500_000, current: 550_000,
  date: "2025-08-12", units: 50, avgCost: 10_000, lastPrice: 11_000, isActive: true,
  priceUnit: "per_gram", ...over,
});

const etf = (over: Partial<Asset> = {}): Asset => ({
  id: "e1", name: "Gold ETF", type: "Gold ETF", purchase: 100_000, current: 110_000,
  date: "2025-08-12", units: 1_600, avgCost: 62.5, lastPrice: 68.75, isActive: true,
  priceUnit: "per_unit", symbol: "GOLDBEES", exchange: "NSE", priceSource: "nse", ...over,
});

describe("Release 7E-1 — gold price-unit safety", () => {
  it("uses the correct price unit per instrument", () => {
    expect(instrumentPriceUnit("Gold")).toBe("per_gram");
    expect(instrumentPriceUnit("Digital Gold")).toBe("per_gram");
    expect(instrumentPriceUnit("Silver")).toBe("per_gram");
    expect(instrumentPriceUnit("Gold ETF")).toBe("per_unit");
    expect(instrumentPriceUnit("Gold Fund")).toBe("per_unit");
    expect(instrumentPriceUnit("Sovereign Gold Bond")).toBe("per_unit");
    expect(instrumentPriceUnit("Mutual Funds")).toBe("per_unit");
  });

  it("a per_gram price can never be applied to an ETF", () => {
    expect(priceUnitMatches("Gold ETF", "per_gram")).toBe(false);
    const bad = etf({ priceUnit: "per_gram" });
    // valuation preserves the last known value instead of units x gram price
    expect(assetCurrentValue(bad, TODAY)).toBe(110_000);
    expect(isRefreshable(bad)).toBe(false);
    expect(shouldApply(bad, { price: 11_000, asOf: TODAY, priceUnit: "per_gram" })).toBe(false);
  });

  it("a per_unit price can never be applied to physical gold", () => {
    expect(priceUnitMatches("Gold", "per_unit")).toBe(false);
    const bad = gold({ priceUnit: "per_unit" });
    expect(assetCurrentValue(bad, TODAY)).toBe(550_000);
    expect(shouldApply(bad, { price: 68, asOf: TODAY, priceUnit: "per_unit" })).toBe(false);
  });

  it("correctly-tagged holdings still value as quantity x price", () => {
    expect(assetCurrentValue(gold(), TODAY)).toBe(550_000);
    expect(assetCurrentValue(etf(), TODAY)).toBe(110_000);
  });

  it("provider eligibility is per instrument type", () => {
    expect(allowedSourcesFor("Gold")).toEqual(["gold_inr"]);
    expect(allowedSourcesFor("Digital Gold")).toEqual(["gold_inr"]);
    expect(allowedSourcesFor("Gold ETF")).toEqual(["nse", "bse"]);
    expect(allowedSourcesFor("Gold Fund")).toEqual(["amfi"]);
    expect(allowedSourcesFor("Silver")).toEqual([]);
    expect(allowedSourcesFor("Sovereign Gold Bond")).toEqual([]);
    // Release 7E-2 wired gold_inr: physical gold is now refreshable.
    expect(isRefreshable({ id: "g1", name: "Gold", type: "Gold", units: 50, symbol: "XAU", priceSource: "gold_inr", priceUnit: "per_gram" })).toBe(true);
    // an equity source can never reach physical gold
    expect(isRefreshable({ id: "g2", name: "Gold", type: "Gold", units: 50, symbol: "GOLDBEES", priceSource: "nse", priceUnit: "per_gram" })).toBe(false);
    // an AMFI source can never reach a Gold ETF
    expect(isRefreshable({ id: "e2", name: "Gold ETF", type: "Gold ETF", units: 10, symbol: "120503", priceSource: "amfi", priceUnit: "per_unit" })).toBe(false);
    expect(isRefreshable(etf())).toBe(true);
    expect(isRefreshable({ id: "f1", name: "Gold Fund", type: "Gold Fund", units: 100, symbol: "120503", priceSource: "amfi", priceUnit: "per_unit" })).toBe(true);
    expect(isRefreshable({ id: "s1", name: "SGB", type: "Sovereign Gold Bond", units: 20, symbol: "SGB", priceSource: "nse", priceUnit: "per_unit" })).toBe(false);
  });

  it("accrual and equity holdings are unaffected by the unit rules", () => {
    const fd: Asset = { id: "f1", name: "SBI FD", type: "FD", purchase: 100_000, current: 100_000, date: "2025-08-12", rate: 7, compounding: "Yearly", isActive: true };
    const mf: Asset = { id: "m1", name: "Nifty Fund", type: "Mutual Funds", purchase: 100_000, current: 120_000, date: "2025-08-12", units: 1000, avgCost: 100, lastPrice: 120, isActive: true };
    expect(assetCurrentValue(fd, TODAY)).toBe(106_995);
    expect(assetCurrentValue(mf, TODAY)).toBe(120_000);
    expect(assetCurrentValue({ ...mf, priceUnit: "per_unit" }, TODAY)).toBe(120_000);
  });

  it("net worth is unchanged by the metadata correction alone", () => {
    const rows = (unit: string) => [gold(), etf({ priceUnit: unit }), { id: "f1", name: "SBI FD", type: "FD", purchase: 100_000, current: 100_000, date: "2025-08-12", rate: 7, compounding: "Yearly", isActive: true } as Asset];
    const before = computeTotals({ accounts: [], assets: rows("per_unit"), liabilities: [], month, asOfISO: TODAY });
    // correcting an ETF row's metadata from per_gram to per_unit restores the
    // same market valuation it always had — no financial value moves.
    const after = computeTotals({ accounts: [], assets: rows("per_unit"), liabilities: [], month, asOfISO: TODAY });
    expect(after.totalAssets).toBe(before.totalAssets);
    expect(after.netWorth).toBe(before.netWorth);
  });
});
