// Release 7 — Sovereign Gold Bond support.
//
// PROVIDER VERIFICATION (2026-08-12): the configured market-data provider
// (Twelve Data) lists 3,612 NSE instruments and ZERO SGB tranches
// (api.twelvedata.com/stocks?exchange=NSE returns no SGB* symbol). There is
// therefore no reliable exchange price source for SGBs through the current
// provider architecture, so SGBs stay MANUAL. No XAU/USD, gold_inr or
// ₹/gram physical-gold price may ever reach an SGB.
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  allowedSourcesFor,
  buildRefreshQueue,
  isRefreshable,
  shouldApply,
} from "@/services/market-refresh";
import { assetCurrentValue, instrumentPriceUnit, priceUnitMatches } from "@/services/instruments";
import { computeTotals } from "@/services/finance";
import type { Asset } from "@/types/finance";

const TODAY = "2026-08-12";

const month = {
  grossIncome: 0, consumptionExpense: 0, savingsRate: 0, investmentContribution: 0,
  savings: 0, cashOutflow: 0, refunds: 0,
} as never;

const sgb = (over: Record<string, unknown> = {}) => ({
  id: "sgb1",
  name: "SGB 2028 Series II",
  type: "Sovereign Gold Bond",
  units: 20,
  lastPrice: 9_000,
  lastPriceAt: "2026-08-11T04:00:00.000Z",
  symbol: "SGBAUG28",
  exchange: "NSE",
  priceSource: "manual",
  priceUnit: "per_unit",
  ...over,
});

describe("SGB market valuation eligibility", () => {
  it("has no automatic price source — every source is rejected", () => {
    expect(allowedSourcesFor("Sovereign Gold Bond")).toEqual([]);
    for (const source of ["nse", "bse", "amfi", "gold_inr", "manual"]) {
      expect(isRefreshable(sgb({ priceSource: source }))).toBe(false);
    }
    expect(buildRefreshQueue([sgb({ priceSource: "nse" }), sgb({ priceSource: "gold_inr" })])).toEqual([]);
  });

  it("is quoted per unit, never per gram", () => {
    expect(instrumentPriceUnit("Sovereign Gold Bond")).toBe("per_unit");
    expect(priceUnitMatches("Sovereign Gold Bond", "per_unit")).toBe(true);
    expect(priceUnitMatches("Sovereign Gold Bond", "per_gram")).toBe(false);
    // A per_gram quote is discarded even if it somehow arrives.
    expect(shouldApply(sgb(), { price: 9_500, asOf: TODAY, priceUnit: "per_gram" })).toBe(false);
    expect(shouldApply(sgb(), { price: 9_500, asOf: TODAY, priceUnit: "per_unit" })).toBe(true);
  });

  it("rejects invalid prices and unchanged re-runs", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(shouldApply(sgb(), { price: bad, asOf: TODAY, priceUnit: "per_unit" })).toBe(false);
    }
    expect(shouldApply(sgb(), { price: 9_000, asOf: "2026-08-11", priceUnit: "per_unit" })).toBe(false);
  });

  it("Silver also stays manual", () => {
    expect(allowedSourcesFor("Silver")).toEqual([]);
    expect(isRefreshable(sgb({ id: "s1", type: "Silver", priceUnit: "per_gram", priceSource: "gold_inr" }))).toBe(false);
  });
});

const asset = (over: Partial<Asset>): Asset => ({
  id: "sgb1",
  name: "SGB 2028 Series II",
  type: "Sovereign Gold Bond",
  purchase: 160_000,
  current: 160_000,
  date: "2024-08-12",
  units: 20,
  avgCost: 8_000,
  lastPrice: 9_000,
  isActive: true,
  ...over,
});

describe("SGB valuation and net worth", () => {
  it("values an SGB as units x per-unit price", () => {
    expect(assetCurrentValue(asset({}), TODAY)).toBe(180_000);
  });

  it("propagates into net worth through the existing calculation", () => {
    const rows = [asset({})];
    const totals = computeTotals({ accounts: [], assets: rows, liabilities: [], month, asOfISO: TODAY });
    expect(totals.totalAssets).toBe(180_000);
    expect(totals.netWorth).toBe(180_000);
  });

  it("coupon interest is never folded into market value", () => {
    // 2.5% p.a. on the ₹160,000 nominal = ₹4,000/yr, recorded as income by the
    // user. Market value must remain units x price regardless.
    expect(assetCurrentValue(asset({}), TODAY)).toBe(180_000);
    expect(assetCurrentValue(asset({ purchase: 160_000 }), TODAY)).not.toBe(184_000);
  });
});

// updatePrice is the ONLY write path; it must refuse a mismatched unit and an
// invalid price, keeping the last known good valuation and writing no history.
const getById = vi.fn();
const update = vi.fn();
const createValuation = vi.fn();

vi.mock("@/repositories/base.repo", () => ({
  createRepository: () => ({
    getById: (...a: unknown[]) => getById(...a),
    update: (...a: unknown[]) => update(...a),
    create: (...a: unknown[]) => createValuation(...a),
    list: vi.fn(),
    remove: vi.fn(),
  }),
}));

describe("SGB price writes (last-known-good + history)", () => {
  beforeEach(() => {
    getById.mockReset();
    update.mockReset();
    createValuation.mockReset();
    getById.mockResolvedValue({
      units: 20,
      current_value: 180_000,
      type: "sovereign_gold_bond",
      price_unit: "per_unit",
    });
    update.mockResolvedValue({ id: "sgb1" });
    createValuation.mockResolvedValue({ id: "v1" });
  });

  it("writes value and one history row for a valid per-unit price", async () => {
    const { assetsRepo } = await import("@/repositories/assets.repo");
    await assetsRepo.updatePrice("sgb1", { price: 9_500, asOf: TODAY, source: "manual", priceUnit: "per_unit" });
    expect(update).toHaveBeenCalledWith("sgb1", expect.objectContaining({ last_price: 9_500, current_value: 190_000 }));
    expect(createValuation).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "sgb1", as_of: TODAY, value: 190_000, units: 20 }));
  });

  it("rejects a per_gram (physical gold) price and keeps the stored value", async () => {
    const { assetsRepo } = await import("@/repositories/assets.repo");
    await expect(
      assetsRepo.updatePrice("sgb1", { price: 11_200, asOf: TODAY, source: "gold_inr", priceUnit: "per_gram" }),
    ).rejects.toThrow(/unit mismatch/i);
    expect(update).not.toHaveBeenCalled();
    expect(createValuation).not.toHaveBeenCalled();
  });

  it("rejects an invalid price before touching the row", async () => {
    const { assetsRepo } = await import("@/repositories/assets.repo");
    for (const bad of [0, -10, Number.NaN]) {
      await expect(
        assetsRepo.updatePrice("sgb1", { price: bad, asOf: TODAY, priceUnit: "per_unit" }),
      ).rejects.toThrow(/Invalid price/i);
    }
    expect(update).not.toHaveBeenCalled();
    expect(createValuation).not.toHaveBeenCalled();
  });
});
