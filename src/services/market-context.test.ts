import { describe, expect, it } from "vitest";
import { buildMarketContext, type ValuationPoint } from "./market-context";
import { detectIntent } from "@/lib/ask-finora.server";
import type { Asset } from "@/types/finance";

const TODAY = "2026-08-12";

/** The real Release 7C test holding. Never mutated by these tests. */
const jio = (overrides: Partial<Asset> = {}): Asset => ({
  id: "jio-1",
  name: "JioBlackRock Flexi Cap Fund – Direct Growth",
  type: "Mutual Funds",
  purchase: 500,
  current: 500,
  date: "2026-08-01",
  units: 49.6,
  avgCost: 10.08,
  lastPrice: 10.168,
  symbol: "153859",
  priceSource: "amfi",
  priceUnit: "per_unit",
  lastPriceAt: `${TODAY}T06:00:00Z`,
  isActive: true,
  ...overrides,
});

const gold = (): Asset => ({
  id: "gold-1",
  name: "Gold ETF",
  type: "Gold ETF",
  purchase: 10000,
  current: 10000,
  date: "2026-05-01",
  units: 100,
  lastPrice: 95,
  priceSource: "gold_inr",
  isActive: true,
});

const fd = (): Asset => ({
  id: "fd-1",
  name: "Bank FD",
  type: "FD",
  purchase: 100000,
  current: 100000,
  date: "2025-08-01",
  rate: 7,
  compounding: "Yearly",
  isActive: true,
});

const v = (assetId: string, asOf: string, value: number): ValuationPoint => ({ assetId, asOf, value });

describe("market context — single holding with current and previous valuation", () => {
  const ctx = buildMarketContext(
    [jio()],
    [v("jio-1", "2026-08-11", 500), v("jio-1", TODAY, 504)],
    TODAY,
  );

  it("values the holding through assetCurrentValue (units x NAV)", () => {
    expect(ctx.holdings).toHaveLength(1);
    expect(ctx.holdings[0].value).toBe(504);
    expect(ctx.value).toBe(504);
  });

  it("reports the unrealised gain, not income", () => {
    expect(ctx.holdings[0].invested).toBe(500);
    expect(ctx.holdings[0].gain).toBe(4);
    expect(ctx.gain).toBe(4);
    expect(ctx.gainPct).toBeCloseTo(0.8, 1);
  });

  it("computes market valuation change as latest minus previous", () => {
    expect(ctx.holdings[0].previousValuationValue).toBe(500);
    expect(ctx.holdings[0].latestValuationValue).toBe(504);
    expect(ctx.holdings[0].valuationChange).toBe(4);
    expect(ctx.holdings[0].changeIsToday).toBe(true);
    expect(ctx.valuationChange).toBe(4);
    expect(ctx.valuationChangeToday).toBe(4);
  });

  it("keeps the market change separate from a transaction contribution", () => {
    // The ₹500 contribution is invested cost, never part of the market change.
    expect(ctx.invested).toBe(500);
    expect(ctx.valuationChange).not.toBe(ctx.invested);
  });
});

describe("market context — no previous valuation", () => {
  const ctx = buildMarketContext([jio()], [v("jio-1", TODAY, 504)], TODAY);

  it("never invents a previous price", () => {
    expect(ctx.holdings[0].valuationChange).toBeNull();
    expect(ctx.holdings[0].previousValuationValue).toBeNull();
    expect(ctx.valuationChange).toBeNull();
    expect(ctx.valuationChangeToday).toBeNull();
    expect(ctx.withoutPreviousValuation).toEqual([jio().name]);
  });

  it("still reports the current value and unrealised gain", () => {
    expect(ctx.holdings[0].value).toBe(504);
    expect(ctx.holdings[0].gain).toBe(4);
  });
});

describe("market context — multiple holdings and multiple valuation records", () => {
  const ctx = buildMarketContext(
    [jio(), gold(), fd()],
    [
      v("jio-1", "2026-08-09", 498),
      v("jio-1", "2026-08-11", 500),
      v("jio-1", TODAY, 504),
      v("gold-1", "2026-08-01", 9200),
      v("gold-1", TODAY, 9500),
    ],
    TODAY,
  );

  it("excludes accrual instruments such as FDs from market holdings", () => {
    expect(ctx.holdings.map((h) => h.assetId).sort()).toEqual(["gold-1", "jio-1"]);
  });

  it("uses only the two most recent valuations per holding", () => {
    const j = ctx.holdings.find((h) => h.assetId === "jio-1")!;
    expect(j.previousValuationDate).toBe("2026-08-11");
    expect(j.valuationChange).toBe(4);
  });

  it("aggregates portfolio value, unrealised gain and market change", () => {
    expect(ctx.value).toBe(504 + 9500);
    expect(ctx.invested).toBe(10500);
    expect(ctx.gain).toBe(504 + 9500 - 10500);
    expect(ctx.valuationChange).toBe(4 + 300);
  });

  it("ranks the best and weakest performer by unrealised return", () => {
    expect(ctx.best?.assetId).toBe("jio-1");
    expect(ctx.worst?.assetId).toBe("gold-1");
  });
});

describe("market change flows into the net-worth explanation inputs", () => {
  it("separates market valuation change from cash contributions", () => {
    const ctx = buildMarketContext([jio()], [v("jio-1", "2026-08-11", 500), v("jio-1", TODAY, 504)], TODAY);
    const contributionToday = 0; // no transaction recorded today
    const netWorthDelta = contributionToday + (ctx.valuationChange ?? 0);
    expect(netWorthDelta).toBe(4);
    expect(contributionToday).toBe(0);
  });
});

describe("intent routing stays market-aware without breaking What-If", () => {
  it("routes factual market questions to market_performance", () => {
    for (const q of [
      "How much did my mutual funds gain?",
      "How much did my investments gain today?",
      "How much did I make from my mutual funds?",
      "Did my investments go up today?",
      "What changed in my portfolio?",
      "Which investment performed best?",
      "How much is my mutual fund worth now?",
      "What is my total unrealised gain?",
    ]) {
      expect(detectIntent(q)).toBe("market_performance");
    }
  });

  it("routes net-worth and earnings questions correctly", () => {
    expect(detectIntent("Why did my net worth change?")).toBe("net_worth_change");
    expect(detectIntent("How much did the market contribute to my net worth change?")).toBe("net_worth_change");
    expect(detectIntent("How much did I earn today?")).toBe("earned_today");
  });

  it("leaves existing What-If intents unchanged", () => {
    expect(detectIntent("What if I invest ₹10,000 more every month?")).toBe("invest_more");
    expect(detectIntent("How can I reach ₹50L?")).toBe("target_reach");
    expect(detectIntent("Can I afford a ₹40,000 car EMI?")).toBe("affordability");
    expect(detectIntent("When will I become debt free?")).toBe("debt_free");
    expect(detectIntent("Should I invest ₹2L or prepay my loan?")).toBe("invest_vs_prepay");
    expect(detectIntent("How am I doing financially?")).toBe("financial_health");
  });
});
