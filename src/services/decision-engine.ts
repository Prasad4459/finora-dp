// PURE decision layer — Release 6 (Ask Finora 2.0).
//
// SAFETY: like the What-If engine this module is 100% read-only. It imports no
// Supabase, React or repository code. It does NOT introduce a second financial
// model: every figure below is produced by composing the existing primitives in
// `scenario-engine.ts` (projectNetWorth, projectLoanBalance, projectCashFlow,
// projectInvestmentValue, emiFor). Nothing here re-implements them.
import {
  emiFor,
  monthLabelFromNow,
  projectCashFlow,
  projectLoanBalance,
  projectNetWorth,
  type FinanceSnapshot,
  type ScenarioLiability,
} from "./scenario-engine";

const round = (n: number) => Math.round(n * 100) / 100;
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Longest horizon we consider meaningful (50 years). */
export const MAX_PROJECTION_MONTHS = 600;

type From = { year: number; month: number };

/** Net worth after `months`, with an optional extra monthly investment. */
function netWorthAfter(s: FinanceSnapshot, months: number, additionalMonthly: number, annualReturn: number): number {
  const flow = projectCashFlow(s, { investment: additionalMonthly });
  return projectNetWorth({
    cash: s.totalBalance,
    investments: s.totalInvestments,
    otherAssets: Math.max(0, s.totalAssets - s.totalInvestments),
    debts: s.liabilities,
    monthlySurplus: flow.surplus,
    monthlyInvestment: s.monthlyInvestment + additionalMonthly,
    annualReturn,
    months,
  }).netWorth;
}

/* ------------------------------------------------------------------ */
/* A. TARGET REACH                                                     */
/* ------------------------------------------------------------------ */

export type TargetPath = {
  label: string;
  additionalMonthly: number;
  totalMonthlyInvestment: number;
  monthlySurplusAfter: number;
  months: number | null;
  reachedBy: string | null;
  /** Projected net worth at the end of the search horizon, for context. */
  netWorthAtHorizon: number;
  affordable: boolean;
};

export type TargetReachResult = {
  target: number;
  currentNetWorth: number;
  gap: number;
  paths: TargetPath[];
  /** Present when the question named a deadline ("₹50L in 5 years"). */
  deadline?: {
    months: number;
    /** Extra monthly investment needed on top of today's; null when unreachable. */
    additionalMonthly: number | null;
    totalMonthly: number | null;
    reachableWithCurrentSurplus: boolean;
  };
  assumptions: Array<{ label: string; value: string }>;
  notes: string[];
};

/** Months until projected net worth first reaches `target` (engine-projected). */
export function monthsToTarget(
  s: FinanceSnapshot,
  target: number,
  additionalMonthly: number,
  annualReturn: number,
): number | null {
  if (netWorthAfter(s, 0, additionalMonthly, annualReturn) >= target) return 0;
  if (netWorthAfter(s, MAX_PROJECTION_MONTHS, additionalMonthly, annualReturn) < target) return null;
  let low = 0;
  let high = MAX_PROJECTION_MONTHS;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (netWorthAfter(s, mid, additionalMonthly, annualReturn) >= target) high = mid;
    else low = mid + 1;
  }
  return low;
}

/** Extra monthly investment needed to hit `target` within `months`. */
export function requiredMonthlyForTarget(
  s: FinanceSnapshot,
  target: number,
  months: number,
  annualReturn: number,
): number | null {
  if (months <= 0) return null;
  if (netWorthAfter(s, months, 0, annualReturn) >= target) return 0;
  let low = 0;
  let high = Math.max(10000, target / months) * 4;
  if (netWorthAfter(s, months, high, annualReturn) < target) return null;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (netWorthAfter(s, mid, annualReturn === 0 ? 0 : months, annualReturn) >= target) high = mid;
    else low = mid;
  }
  return Math.round(high);
}

export function runTargetReachScenario(
  s: FinanceSnapshot,
  input: { target: number; annualReturn: number; deadlineMonths?: number | null },
  from: From,
): TargetReachResult {
  const surplus = projectCashFlow(s).surplus;
  const steps = [0, 10000, 20000];
  // When the surplus is small, ₹10k/₹20k steps are unrealistic — scale them.
  if (surplus > 0 && surplus < 25000) {
    steps[1] = Math.max(1000, Math.round((surplus * 0.25) / 500) * 500);
    steps[2] = Math.max(2000, Math.round((surplus * 0.5) / 500) * 500);
  }

  const paths: TargetPath[] = steps.map((additionalMonthly) => {
    const months = monthsToTarget(s, input.target, additionalMonthly, input.annualReturn);
    return {
      label: additionalMonthly === 0 ? "Current path" : `+${inr(additionalMonthly)}/month invested`,
      additionalMonthly,
      totalMonthlyInvestment: round(s.monthlyInvestment + additionalMonthly),
      monthlySurplusAfter: round(surplus - additionalMonthly),
      months,
      reachedBy: months === null ? null : monthLabelFromNow(months, from),
      netWorthAtHorizon: netWorthAfter(s, Math.min(months ?? 120, 120), additionalMonthly, input.annualReturn),
      affordable: additionalMonthly <= surplus,
    };
  });

  const notes: string[] = [];
  if (surplus <= 0) {
    notes.push(
      `Your recent average monthly surplus is ${inr(surplus)}, so nothing is being added to net worth each month on the current path.`,
    );
  }
  if (paths[0].months === null) {
    notes.push("On the current path this target is not reached within 50 years, so no date can be projected.");
  }

  const result: TargetReachResult = {
    target: input.target,
    currentNetWorth: s.netWorth,
    gap: round(Math.max(0, input.target - s.netWorth)),
    paths,
    assumptions: [
      { label: "Target", value: inr(input.target) },
      { label: "Starting net worth", value: inr(s.netWorth) },
      { label: "Assumed investment return", value: `${input.annualReturn}% annually (estimated, not guaranteed)` },
      {
        label: "Income & expenses",
        value: `Held at your recent average of ${inr(s.monthlyIncome)} in / ${inr(s.monthlyExpenses)} out over ${s.monthsOfHistory} month(s)`,
      },
      { label: "Existing monthly investing", value: `${inr(s.monthlyInvestment)} / month` },
      { label: "Other assets", value: "Held flat — no appreciation assumed" },
    ],
    notes,
  };

  if (input.deadlineMonths && input.deadlineMonths > 0) {
    const additional = requiredMonthlyForTarget(s, input.target, input.deadlineMonths, input.annualReturn);
    result.deadline = {
      months: input.deadlineMonths,
      additionalMonthly: additional,
      totalMonthly: additional === null ? null : round(s.monthlyInvestment + additional),
      reachableWithCurrentSurplus: additional !== null && additional <= surplus,
    };
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* B. AFFORDABILITY                                                    */
/* ------------------------------------------------------------------ */

export type AffordabilityStatus = "COMFORTABLE" | "STRETCHED" | "NOT AFFORDABLE";

export type AffordabilityResult = {
  emi: number;
  /** Set when the user named a purchase price rather than an EMI. */
  purchaseAmount?: number;
  currentSurplus: number;
  existingEmi: number;
  surplusAfter: number;
  emiToIncomeRatio: number | null;
  totalEmiToIncomeRatio: number | null;
  status: AffordabilityStatus;
  reasons: string[];
  assumptions: Array<{ label: string; value: string }>;
};

/** EMI implied by a purchase price at the given rate/tenure (engine's emiFor). */
export const emiForPurchase = (price: number, annualRate: number, tenureMonths: number) =>
  emiFor(price, annualRate, tenureMonths);

export function assessAffordability(
  s: FinanceSnapshot,
  input: { emi: number; purchaseAmount?: number; annualRate: number; tenureMonths: number },
): AffordabilityResult {
  const surplus = projectCashFlow(s).surplus;
  const surplusAfter = round(surplus - input.emi);
  const ratio = s.monthlyIncome > 0 ? round((input.emi / s.monthlyIncome) * 100) : null;
  const totalRatio = s.monthlyIncome > 0 ? round(((s.monthlyEmi + input.emi) / s.monthlyIncome) * 100) : null;

  const reasons: string[] = [];
  let status: AffordabilityStatus;
  if (surplusAfter < 0) {
    status = "NOT AFFORDABLE";
    reasons.push(
      `The EMI of ${inr(input.emi)} is larger than your recent average monthly surplus of ${inr(surplus)}, so it would put your monthly cash flow into deficit.`,
    );
  } else if (input.emi > surplus * 0.5 || (totalRatio !== null && totalRatio > 40)) {
    status = "STRETCHED";
    reasons.push(
      `The EMI leaves ${inr(surplusAfter)} of monthly surplus, which is less than half of the ${inr(surplus)} you have today.`,
    );
    if (totalRatio !== null && totalRatio > 40) {
      reasons.push(`Total EMI commitments would be about ${totalRatio}% of your average monthly income.`);
    }
  } else {
    status = "COMFORTABLE";
    reasons.push(`The EMI leaves ${inr(surplusAfter)} of monthly surplus after all existing commitments.`);
  }
  if (s.monthlyEmi > 0) {
    reasons.push(`You already commit ${inr(s.monthlyEmi)} a month to existing EMIs.`);
  }
  if (s.monthsOfHistory <= 1) {
    reasons.push("This is based on a single month of recorded activity, so the average may not be representative.");
  }

  return {
    emi: round(input.emi),
    ...(input.purchaseAmount !== undefined ? { purchaseAmount: input.purchaseAmount } : {}),
    currentSurplus: round(surplus),
    existingEmi: round(s.monthlyEmi),
    surplusAfter,
    emiToIncomeRatio: ratio,
    totalEmiToIncomeRatio: totalRatio,
    status,
    reasons,
    assumptions: [
      ...(input.purchaseAmount !== undefined
        ? [{ label: "Purchase price", value: inr(input.purchaseAmount) }]
        : []),
      { label: "EMI considered", value: `${inr(input.emi)} / month` },
      { label: "Assumed loan interest", value: `${input.annualRate}% annually` },
      { label: "Assumed tenure", value: `${input.tenureMonths} months` },
      {
        label: "Surplus basis",
        value: `Recent average over ${s.monthsOfHistory} month(s) with activity`,
      },
    ],
  };
}

/** Largest EMI that keeps the user in the COMFORTABLE band. */
export function comfortableEmiCeiling(s: FinanceSnapshot): number {
  const surplus = projectCashFlow(s).surplus;
  if (surplus <= 0) return 0;
  const byIncome = s.monthlyIncome > 0 ? Math.max(0, s.monthlyIncome * 0.4 - s.monthlyEmi) : Infinity;
  return Math.max(0, Math.round(Math.min(surplus * 0.5, byIncome) / 500) * 500);
}

/* ------------------------------------------------------------------ */
/* C. DEBT FREE                                                        */
/* ------------------------------------------------------------------ */

export type DebtLine = {
  name: string;
  balance: number;
  rate: number;
  rateKnown: boolean;
  emi: number;
  payoffMonths: number | null;
  payoffBy: string | null;
  totalInterest: number;
};

export type DebtFreeResult = {
  totalDebt: number;
  monthlyEmi: number;
  lines: DebtLine[];
  debtFreeMonths: number | null;
  debtFreeBy: string | null;
  highestCost: string | null;
  /** Effect of putting the current monthly surplus into the costliest loan. */
  surplusPrepay?: {
    monthlyExtra: number;
    payoffMonths: number | null;
    monthsSaved: number | null;
    interestSaved: number;
  };
  notes: string[];
  assumptions: Array<{ label: string; value: string }>;
};

export function runDebtFreeScenario(s: FinanceSnapshot, from: From): DebtFreeResult {
  const surplus = projectCashFlow(s).surplus;
  const lines: DebtLine[] = s.liabilities.map((l) => {
    const p = projectLoanBalance(l.balance, l.rate, l.emi, MAX_PROJECTION_MONTHS);
    return {
      name: l.name,
      balance: round(l.balance),
      rate: l.rate,
      rateKnown: l.rate > 0,
      emi: round(l.emi),
      payoffMonths: p.payoffMonths,
      payoffBy: p.payoffMonths === null ? null : monthLabelFromNow(p.payoffMonths, from),
      totalInterest: p.totalInterest,
    };
  });

  const anyUnknown = lines.some((l) => l.payoffMonths === null);
  const debtFreeMonths = lines.length === 0 ? 0 : anyUnknown ? null : Math.max(...lines.map((l) => l.payoffMonths ?? 0));

  const notes: string[] = [];
  for (const l of lines) {
    if (!l.rateKnown) notes.push(`The interest rate for "${l.name}" is not recorded, so its interest cost is unknown.`);
    if (l.emi <= 0) notes.push(`No EMI is recorded for "${l.name}", so its payoff date cannot be projected.`);
    else if (l.payoffMonths === null && l.rateKnown) {
      notes.push(`The recorded EMI for "${l.name}" does not clear the balance within 50 years — check the EMI or rate.`);
    }
  }

  const costliest = lines
    .filter((l) => l.rateKnown && l.balance > 0)
    .sort((a, b) => b.rate - a.rate)[0];

  const result: DebtFreeResult = {
    totalDebt: round(s.totalDebt),
    monthlyEmi: round(s.monthlyEmi),
    lines,
    debtFreeMonths,
    debtFreeBy: debtFreeMonths === null ? null : monthLabelFromNow(debtFreeMonths, from),
    highestCost: costliest ? `${costliest.name} at ${costliest.rate}%` : null,
    notes,
    assumptions: [
      { label: "EMIs", value: "Held at the amounts recorded in Finora" },
      { label: "Interest", value: "Reducing-balance, monthly rest, at each loan's recorded rate" },
      { label: "Projection limit", value: "50 years" },
    ],
  };

  if (costliest && surplus > 0 && costliest.emi > 0) {
    const target: ScenarioLiability = {
      id: "costliest",
      name: costliest.name,
      balance: costliest.balance,
      rate: costliest.rate,
      emi: costliest.emi,
      remainingMonths: costliest.payoffMonths ?? 0,
    };
    const boosted = projectLoanBalance(target.balance, target.rate, target.emi + surplus, MAX_PROJECTION_MONTHS);
    result.surplusPrepay = {
      monthlyExtra: round(surplus),
      payoffMonths: boosted.payoffMonths,
      monthsSaved:
        boosted.payoffMonths !== null && costliest.payoffMonths !== null
          ? costliest.payoffMonths - boosted.payoffMonths
          : null,
      interestSaved: round(costliest.totalInterest - boosted.totalInterest),
    };
  }

  return result;
}