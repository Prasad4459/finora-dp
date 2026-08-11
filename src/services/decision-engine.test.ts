import { describe, expect, it } from "vitest";
import { emptySnapshot, projectCashFlow, projectNetWorth, type FinanceSnapshot } from "./scenario-engine";
import { requiredMonthlyForTarget, runTargetReachScenario } from "./decision-engine";

/** Regression: ₹50L in 5 years on a ₹39,799 surplus is NOT affordable. */
const snapshot = (): FinanceSnapshot => ({
  ...emptySnapshot(),
  totalBalance: 166799,
  totalAssets: 0,
  totalInvestments: 0,
  netWorth: 166799,
  monthlyIncome: 90000,
  monthlyExpenses: 35201,
  monthlyInvestment: 15000,
  monthlySurplus: 39799,
  monthsOfHistory: 6,
});

describe("target reach — ₹50L in 60 months", () => {
  const s = snapshot();
  const target = 5_000_000;
  const months = 60;
  const annualReturn = 10;

  it("never asks for more than the monthly surplus", () => {
    const additional = requiredMonthlyForTarget(s, target, months, annualReturn);
    expect(additional).toBeNull();
  });

  it("reports the deadline as unaffordable with a verified best case", () => {
    const r = runTargetReachScenario(s, { target, annualReturn, deadlineMonths: months }, { year: 2026, month: 8 });
    expect(r.deadline).toBeDefined();
    const d = r.deadline!;
    expect(d.additionalMonthly).toBeNull();
    expect(d.reachableWithCurrentSurplus).toBe(false);
    expect(d.maxAffordableMonthly).toBe(54799);
    expect(d.bestCaseNetWorth).toBeLessThan(target);
    expect(d.shortfall).toBeGreaterThan(0);

    // Verify the best case through the projection engine itself.
    const flow = projectCashFlow(s, { investment: 39799 });
    const nw = projectNetWorth({
      cash: s.totalBalance,
      investments: s.totalInvestments,
      otherAssets: 0,
      debts: [],
      monthlySurplus: flow.surplus,
      monthlyInvestment: 54799,
      annualReturn,
      months,
    });
    expect(Math.abs(nw.netWorth - d.bestCaseNetWorth)).toBeLessThan(1);
  });

  it("an affordable target resolves to an amount that projects back to the target", () => {
    const reachable = 4_000_000;
    const additional = requiredMonthlyForTarget(s, reachable, months, annualReturn);
    expect(additional).not.toBeNull();
    expect(additional!).toBeLessThanOrEqual(39799);
    const flow = projectCashFlow(s, { investment: additional! });
    const nw = projectNetWorth({
      cash: s.totalBalance,
      investments: s.totalInvestments,
      otherAssets: 0,
      debts: [],
      monthlySurplus: flow.surplus,
      monthlyInvestment: s.monthlyInvestment + additional!,
      annualReturn,
      months,
    });
    expect(nw.netWorth).toBeGreaterThanOrEqual(reachable * 0.995);
    expect(nw.netWorth).toBeLessThanOrEqual(reachable * 1.01);
  });
});
