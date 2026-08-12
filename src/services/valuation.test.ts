import { describe, expect, it } from "vitest";
import { assetCurrentValue, isValidPrice, accruedValue } from "@/services/instruments";
import { buildPortfolio } from "@/services/portfolio";
import { computeTotals } from "@/services/finance";
import type { Asset } from "@/types/finance";

const TODAY = "2026-08-12";

const asset = (over: Partial<Asset>): Asset => ({
  id: over.id ?? "a1",
  name: "Nifty 50 Fund",
  type: "Mutual Funds",
  purchase: 100_000,
  current: 100_000,
  date: "2025-08-12",
  units: 1000,
  avgCost: 100,
  lastPrice: 120,
  isActive: true,
  ...over,
});

const month = {
  grossIncome: 0, consumptionExpense: 0, savingsRate: 0, investmentContribution: 0,
  savings: 0, cashOutflow: 0, refunds: 0,
} as never;

describe("Release 7B — valuation foundation", () => {
  it("rejects invalid prices so a feed failure can never wipe a value", () => {
    expect(isValidPrice(120)).toBe(true);
    [0, -5, NaN, Infinity, null, undefined, "120"].forEach((p) =>
      expect(isValidPrice(p)).toBe(false),
    );
  });

  it("values a unit holding as units x last price", () => {
    expect(assetCurrentValue(asset({}), TODAY)).toBe(120_000);
  });

  it("multiple purchases raise invested cost and units, not the price", () => {
    // second buy: +500 units at 120 => 1500 units, cost 160k, avg 106.67
    const after = asset({ units: 1500, purchase: 160_000, avgCost: 106.67, lastPrice: 120 });
    const p = buildPortfolio([after], TODAY);
    expect(p.value).toBe(180_000);
    expect(p.invested).toBe(160_000);
    expect(p.gain).toBe(20_000);
  });

  it("redemption reduces units and value proportionally", () => {
    const after = asset({ units: 500, purchase: 50_000, avgCost: 100, lastPrice: 120 });
    expect(assetCurrentValue(after, TODAY)).toBe(60_000);
  });

  it("Investments page and net worth report the same value", () => {
    const rows = [asset({}), asset({ id: "a2", name: "SBI FD", type: "FD", units: null, avgCost: null, lastPrice: null, purchase: 200_000, current: 200_000, rate: 7, compounding: "Yearly" })];
    const portfolio = buildPortfolio(rows, TODAY);
    const totals = computeTotals({ accounts: [], assets: rows, liabilities: [], month, asOfISO: TODAY });
    expect(totals.totalAssets).toBe(portfolio.value);
    expect(totals.totalInvestments).toBe(portfolio.value);
  });

  it("accrual assets are unchanged by the market path", () => {
    const fd = asset({ type: "FD", units: null, avgCost: null, lastPrice: null, purchase: 200_000, current: 200_000, rate: 7, compounding: "Yearly", date: "2025-08-12" });
    expect(assetCurrentValue(fd, TODAY)).toBe(
      accruedValue({ principal: 200_000, ratePct: 7, fromISO: "2025-08-12", asOfISO: TODAY, compounding: "Yearly" }),
    );
  });
});
