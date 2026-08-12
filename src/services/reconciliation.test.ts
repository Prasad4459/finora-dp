import { describe, expect, it } from "vitest";
import {
  attributePortfolioChange,
  emptyFlows,
  marketChangeOverPeriod,
  reconcileNetWorth,
  type PeriodFlows,
} from "./reconciliation";
import { detectIntent } from "@/lib/ask-finora.server";

const FROM = "2026-08-01";
const TO = "2026-08-31";

const flows = (o: Partial<PeriodFlows> = {}): PeriodFlows => ({ ...emptyFlows(), ...o });

/** Reconciliation with a KNOWN beginning net worth, so the check is real. */
const reconcile = (opts: {
  beginning: number;
  ending: number;
  flows?: Partial<PeriodFlows>;
  marketChange?: number | null;
}) =>
  reconcileNetWorth({
    from: FROM,
    to: TO,
    label: "Aug 2026",
    beginningNetWorth: opts.beginning,
    endingNetWorth: opts.ending,
    flows: flows(opts.flows),
    marketChange: opts.marketChange === undefined ? 0 : opts.marketChange,
  });

const effect = (r: ReturnType<typeof reconcile>, key: string) =>
  r.components.find((c) => c.key === key)!.effect;

describe("cash-flow activity", () => {
  it("income increases net worth", () => {
    const r = reconcile({ beginning: 100000, ending: 150000, flows: { income: 50000 } });
    expect(r.verifiedChange).toBe(50000);
    expect(effect(r, "income")).toBe(50000);
    expect(r.reconciles).toBe(true);
    expect(r.unexplained).toBe(0);
  });

  it("expense decreases net worth", () => {
    const r = reconcile({ beginning: 100000, ending: 80000, flows: { expense: 20000 } });
    expect(effect(r, "expense")).toBe(-20000);
    expect(r.verifiedChange).toBe(-20000);
    expect(r.reconciles).toBe(true);
  });
});

describe("transfers between cash and investments are net-worth neutral", () => {
  it("an investment contribution does not change net worth", () => {
    const r = reconcile({ beginning: 100000, ending: 100000, flows: { investmentContribution: 25000 } });
    expect(r.verifiedChange).toBe(0);
    expect(r.explainedChange).toBe(0);
    expect(r.reconciles).toBe(true);
    const m = r.neutralMovements.find((n) => n.key === "investment_contribution")!;
    expect(m.amount).toBe(25000);
    expect(m.note).toMatch(/NOT a reduction in net worth/);
    // It must never appear as a net-worth component at all.
    expect(r.components.some((c) => c.effect === -25000)).toBe(false);
  });

  it("an investment withdrawal is not income and does not change net worth", () => {
    const r = reconcile({ beginning: 100000, ending: 100000, flows: { investmentWithdrawal: 30000 } });
    expect(r.verifiedChange).toBe(0);
    expect(effect(r, "income")).toBe(0);
    const m = r.neutralMovements.find((n) => n.key === "investment_withdrawal")!;
    expect(m.amount).toBe(30000);
    expect(m.note).toMatch(/NOT income/);
  });
});

describe("market movement", () => {
  it("appreciation increases net worth without being income", () => {
    const r = reconcile({ beginning: 100000, ending: 105000, marketChange: 5000 });
    expect(effect(r, "market")).toBe(5000);
    expect(effect(r, "income")).toBe(0);
    expect(r.reconciles).toBe(true);
  });

  it("a loss decreases net worth without being an expense or income", () => {
    const r = reconcile({ beginning: 100000, ending: 96000, marketChange: -4000 });
    expect(effect(r, "market")).toBe(-4000);
    expect(effect(r, "expense")).toBe(0);
    expect(effect(r, "income")).toBe(0);
    expect(r.reconciles).toBe(true);
  });

  it("unmeasurable market movement is flagged, never assumed to be zero", () => {
    const r = reconcile({ beginning: 100000, ending: 104000, marketChange: null });
    expect(r.marketChangeUnavailable).toBe(true);
    expect(r.reconciles).toBe(false);
    expect(r.unexplained).toBe(4000);
    expect(r.notes.join(" ")).toMatch(/could not be measured/);
  });
});

describe("loan payments", () => {
  it("separates EMI principal from interest", () => {
    const r = reconcile({
      beginning: 100000,
      ending: 97000,
      flows: { emiPaid: 12000, emiPrincipal: 9000, emiInterest: 3000 },
    });
    expect(effect(r, "emi_interest")).toBe(-3000);
    expect(r.neutralMovements.find((n) => n.key === "emi_principal")!.amount).toBe(9000);
    expect(r.verifiedChange).toBe(-3000);
    expect(r.reconciles).toBe(true);
  });
});

describe("reconciliation catches what the records cannot explain", () => {
  it("reports the unexplained difference instead of inventing a cause", () => {
    const r = reconcile({ beginning: 100000, ending: 140000, flows: { income: 30000 } });
    expect(r.explainedChange).toBe(30000);
    expect(r.verifiedChange).toBe(40000);
    expect(r.unexplained).toBe(10000);
    expect(r.reconciles).toBe(false);
    expect(r.notes.join(" ")).toMatch(/do not fully explain/);
  });

  it("marks a derived beginning net worth as not independently verified", () => {
    const r = reconcileNetWorth({
      from: FROM,
      to: TO,
      label: "Aug 2026",
      beginningNetWorth: null,
      endingNetWorth: 150000,
      flows: flows({ income: 50000, expense: 20000 }),
      marketChange: 0,
    });
    expect(r.beginningIsVerified).toBe(false);
    expect(r.beginningNetWorth).toBe(120000);
    expect(r.verifiedChange).toBeNull();
    expect(r.unexplained).toBeNull();
    expect(r.reconciles).toBe(false);
    expect(r.notes.join(" ")).toMatch(/DERIVED/);
  });

  it("never equates income minus expenses with the net-worth change", () => {
    // Cash flow says +10,000 but the portfolio fell 15,000.
    const r = reconcile({
      beginning: 200000,
      ending: 195000,
      flows: { income: 40000, expense: 30000 },
      marketChange: -15000,
    });
    expect(r.verifiedChange).toBe(-5000);
    expect(effect(r, "income") + effect(r, "expense")).toBe(10000);
    expect(r.reconciles).toBe(true);
  });
});

describe("portfolio change attribution", () => {
  it("splits a change into contribution and market gain", () => {
    const p = attributePortfolioChange({ contributed: 5000, withdrawn: 0, marketChange: 126 });
    expect(p.totalChange).toBe(5126);
    expect(p.explanation).toContain("increased by ₹5,126");
    expect(p.explanation).toContain("₹5,000 came from contributions");
    expect(p.explanation).toContain("₹126 came from market gains");
  });

  it("keeps withdrawals separate and never calls them income", () => {
    const p = attributePortfolioChange({ contributed: 0, withdrawn: 2000, marketChange: -100 });
    expect(p.totalChange).toBe(-2100);
    expect(p.explanation).toContain("₹2,000 was withdrawn");
    expect(p.explanation).not.toMatch(/income|earn/i);
  });

  it("says so when market movement is not measurable", () => {
    const p = attributePortfolioChange({ contributed: 500, withdrawn: 0, marketChange: null });
    expect(p.totalChange).toBeNull();
    expect(p.explanation).toMatch(/not measurable/);
  });
});

describe("market change over a period uses recorded valuations only", () => {
  const rows = [
    { assetId: "a", asOf: "2026-07-31", value: 500 },
    { assetId: "a", asOf: "2026-08-12", value: 504 },
    { assetId: "b", asOf: "2026-08-05", value: 9000 },
  ];

  it("measures latest minus the last valuation before the period", () => {
    const m = marketChangeOverPeriod(rows, FROM, TO);
    expect(m.change).toBe(4);
    expect(m.measuredAssets).toEqual(["a"]);
    expect(m.withoutBaseline).toEqual(["b"]);
  });

  it("returns null when no holding has a baseline", () => {
    const m = marketChangeOverPeriod([rows[2]], FROM, TO);
    expect(m.change).toBeNull();
  });
});

describe("existing behaviour is unchanged", () => {
  it("keeps What-If and market intents routing as before", () => {
    expect(detectIntent("Why did my net worth change?")).toBe("net_worth_change");
    expect(detectIntent("What changed in my portfolio?")).toBe("market_performance");
    expect(detectIntent("How much did my mutual funds gain?")).toBe("market_performance");
    expect(detectIntent("How much did I earn today?")).toBe("earned_today");
    expect(detectIntent("What if I invest ₹10,000 more every month?")).toBe("invest_more");
    expect(detectIntent("How can I reach ₹50L?")).toBe("target_reach");
    expect(detectIntent("When will I become debt free?")).toBe("debt_free");
  });
});
