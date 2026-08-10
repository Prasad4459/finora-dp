// PURE "What If?" scenario engine — Release 5.
//
// SAFETY: this module is 100% read-only. It never imports Supabase, React or
// any repository, and it performs no writes. It receives a snapshot of the
// user's real position and returns projections computed in memory.
//
// All money is rupees, all rates are annual percentages, all periods are whole
// months on the IST calendar.

export type ScenarioGoal = {
  id: string;
  name: string;
  target: number;
  current: number;
  /** Target date as stored (display string) — informational only. */
  targetDate?: string;
};

export type ScenarioLiability = {
  id: string;
  name: string;
  balance: number;
  /** Annual interest rate, e.g. 8.5 */
  rate: number;
  emi: number;
  /** Remaining tenure in months as recorded (0 when unknown). */
  remainingMonths: number;
};

/** Everything the engine is allowed to know about the user. */
export type FinanceSnapshot = {
  /** Liquid balances across net-worth wallets. */
  totalBalance: number;
  /** Non wallet-mirrored assets (includes investments). */
  totalAssets: number;
  /** Invested capital subset of totalAssets. */
  totalInvestments: number;
  totalDebt: number;
  netWorth: number;
  /** Average monthly figures derived from the server-side aggregates. */
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyEmi: number;
  monthlyInvestment: number;
  /** grossIncome − cash outflow, i.e. money left over each month. */
  monthlySurplus: number;
  liabilities: ScenarioLiability[];
  goals: ScenarioGoal[];
  /** Months of history the averages are based on (for the assumptions panel). */
  monthsOfHistory: number;
};

export const emptySnapshot = (): FinanceSnapshot => ({
  totalBalance: 0,
  totalAssets: 0,
  totalInvestments: 0,
  totalDebt: 0,
  netWorth: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  monthlyEmi: 0,
  monthlyInvestment: 0,
  monthlySurplus: 0,
  liabilities: [],
  goals: [],
  monthsOfHistory: 0,
});

export type ProjectionYears = 1 | 3 | 5 | 10;
export const PROJECTION_YEARS: ProjectionYears[] = [1, 3, 5, 10];

const round = (n: number) => Math.round(n * 100) / 100;
const monthlyRate = (annualPct: number) => annualPct / 100 / 12;

/* ------------------------------------------------------------------ */
/* Cash flow                                                          */
/* ------------------------------------------------------------------ */

export type CashFlow = {
  income: number;
  expenses: number;
  emi: number;
  investment: number;
  surplus: number;
};

/**
 * Monthly cash flow after applying hypothetical deltas. Nothing is clamped:
 * a negative surplus is a real (and important) outcome.
 */
export function projectCashFlow(
  s: FinanceSnapshot,
  delta: { emi?: number; investment?: number; expenses?: number } = {},
): CashFlow {
  const emi = s.monthlyEmi + (delta.emi ?? 0);
  const investment = s.monthlyInvestment + (delta.investment ?? 0);
  const expenses = s.monthlyExpenses + (delta.expenses ?? 0);
  const surplus = s.monthlySurplus - (delta.emi ?? 0) - (delta.investment ?? 0) - (delta.expenses ?? 0);
  return { income: s.monthlyIncome, expenses, emi, investment, surplus: round(surplus) };
}

/* ------------------------------------------------------------------ */
/* Loans                                                              */
/* ------------------------------------------------------------------ */

export type LoanProjection = {
  /** Balance still outstanding at the end of the projection window. */
  endingBalance: number;
  totalInterest: number;
  totalPrincipal: number;
  /** Months until the loan clears (null when the EMI never clears it). */
  payoffMonths: number | null;
};

/**
 * Reducing-balance amortisation. Interest accrues monthly on the outstanding
 * balance; the EMI pays interest first and the remainder reduces principal.
 */
export function projectLoanBalance(
  principal: number,
  annualRate: number,
  emi: number,
  months: number,
): LoanProjection {
  let balance = Math.max(0, principal);
  const r = monthlyRate(annualRate);
  let totalInterest = 0;
  let payoffMonths: number | null = balance === 0 ? 0 : null;

  for (let m = 1; m <= months && balance > 0; m++) {
    const interest = balance * r;
    const principalPaid = emi - interest;
    // EMI does not even cover interest -> the loan never clears.
    if (principalPaid <= 0) {
      totalInterest += interest;
      balance += interest - emi;
      continue;
    }
    totalInterest += interest;
    balance = Math.max(0, balance - principalPaid);
    if (balance === 0 && payoffMonths === null) payoffMonths = m;
  }

  return {
    endingBalance: round(balance),
    totalInterest: round(totalInterest),
    totalPrincipal: round(Math.max(0, principal - balance)),
    payoffMonths,
  };
}

/** Standard reducing-balance EMI for a fresh loan. */
export function emiFor(principal: number, annualRate: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = monthlyRate(annualRate);
  if (r === 0) return round(principal / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return round((principal * r * factor) / (factor - 1));
}

/**
 * Interest saved by a one-time prepayment: the difference in total interest
 * between the original loan and the same loan with a smaller balance.
 */
export function prepaymentImpact(
  liability: ScenarioLiability,
  prepayment: number,
  months: number,
): { base: LoanProjection; prepaid: LoanProjection; interestSaved: number; monthsSaved: number | null } {
  const base = projectLoanBalance(liability.balance, liability.rate, liability.emi, months);
  const prepaid = projectLoanBalance(
    Math.max(0, liability.balance - prepayment),
    liability.rate,
    liability.emi,
    months,
  );
  const monthsSaved =
    base.payoffMonths !== null && prepaid.payoffMonths !== null
      ? base.payoffMonths - prepaid.payoffMonths
      : null;
  return {
    base,
    prepaid,
    interestSaved: round(base.totalInterest - prepaid.totalInterest),
    monthsSaved,
  };
}

/* ------------------------------------------------------------------ */
/* Investments                                                        */
/* ------------------------------------------------------------------ */

export type InvestmentProjection = {
  futureValue: number;
  contributed: number;
  growth: number;
};

/** Monthly-compounded growth with contributions made at the end of each month. */
export function projectInvestmentValue(
  initial: number,
  monthlyContribution: number,
  annualReturn: number,
  months: number,
): InvestmentProjection {
  const r = monthlyRate(annualReturn);
  let value = Math.max(0, initial);
  for (let m = 0; m < months; m++) value = value * (1 + r) + monthlyContribution;
  const contributed = monthlyContribution * months;
  return {
    futureValue: round(value),
    contributed: round(contributed),
    growth: round(value - initial - contributed),
  };
}

/* ------------------------------------------------------------------ */
/* Net worth                                                          */
/* ------------------------------------------------------------------ */

export type NetWorthInputs = {
  /** Starting cash, invested capital and other assets. */
  cash: number;
  investments: number;
  otherAssets: number;
  debts: ScenarioLiability[];
  /** Cash left over each month (added to cash, may be negative). */
  monthlySurplus: number;
  /** Cash moved into investments each month. */
  monthlyInvestment: number;
  annualReturn: number;
  months: number;
};

export type NetWorthProjection = {
  netWorth: number;
  cash: number;
  investments: number;
  debt: number;
  interestPaid: number;
};

/**
 * Deterministic net-worth projection:
 *   cash        grows by the monthly surplus
 *   investments grow by the assumed return plus monthly contributions
 *   debts       amortise at their own rate and EMI
 * Other assets are held flat (no appreciation is assumed).
 */
export function projectNetWorth(input: NetWorthInputs): NetWorthProjection {
  const invest = projectInvestmentValue(
    input.investments,
    input.monthlyInvestment,
    input.annualReturn,
    input.months,
  );
  const cash = input.cash + input.monthlySurplus * input.months;
  let debt = 0;
  let interestPaid = 0;
  for (const l of input.debts) {
    const p = projectLoanBalance(l.balance, l.rate, l.emi, input.months);
    debt += p.endingBalance;
    interestPaid += p.totalInterest;
  }
  return {
    netWorth: round(cash + invest.futureValue + input.otherAssets - debt),
    cash: round(cash),
    investments: invest.futureValue,
    debt: round(debt),
    interestPaid: round(interestPaid),
  };
}

/* ------------------------------------------------------------------ */
/* Goals                                                              */
/* ------------------------------------------------------------------ */

export type GoalProjection = {
  goalId: string;
  name: string;
  remaining: number;
  /** Months until fully funded; null when it cannot be projected. */
  months: number | null;
  /** "Nov 2033" — null when months is null. */
  label: string | null;
  reason?: "already-reached" | "no-surplus" | "no-data";
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabelFromNow(monthsAhead: number, from: { year: number; month: number }): string {
  const zero = from.month - 1 + monthsAhead;
  const year = from.year + Math.floor(zero / 12);
  return `${MONTHS[((zero % 12) + 12) % 12]} ${year}`;
}

/**
 * When will a goal be funded? The monthly amount available for goals is the
 * surplus, shared across unfunded goals in proportion to what each still
 * needs. Never invents a date: an unfundable goal returns months = null.
 */
export function projectGoalDate(
  goals: ScenarioGoal[],
  monthlySurplus: number,
  from: { year: number; month: number },
): GoalProjection[] {
  const unfunded = goals.filter((g) => g.target - g.current > 0);
  const totalRemaining = unfunded.reduce((s, g) => s + (g.target - g.current), 0);

  return goals.map((g) => {
    const remaining = round(Math.max(0, g.target - g.current));
    if (remaining === 0) {
      return { goalId: g.id, name: g.name, remaining: 0, months: 0, label: monthLabelFromNow(0, from), reason: "already-reached" as const };
    }
    if (monthlySurplus <= 0 || totalRemaining <= 0) {
      return { goalId: g.id, name: g.name, remaining, months: null, label: null, reason: "no-surplus" as const };
    }
    const share = (remaining / totalRemaining) * monthlySurplus;
    if (share <= 0) return { goalId: g.id, name: g.name, remaining, months: null, label: null, reason: "no-surplus" as const };
    const months = Math.ceil(remaining / share);
    // Beyond 50 years the projection is not meaningful.
    if (!Number.isFinite(months) || months > 600) {
      return { goalId: g.id, name: g.name, remaining, months: null, label: null, reason: "no-data" as const };
    }
    return { goalId: g.id, name: g.name, remaining, months, label: monthLabelFromNow(months, from) };
  });
}

export type GoalImpact = {
  goalId: string;
  name: string;
  currentMonths: number | null;
  scenarioMonths: number | null;
  currentLabel: string | null;
  scenarioLabel: string | null;
  /** Positive = delayed by N months, negative = reached N months earlier. */
  deltaMonths: number | null;
  message: string;
};

export function compareGoals(
  goals: ScenarioGoal[],
  currentSurplus: number,
  scenarioSurplus: number,
  from: { year: number; month: number },
): GoalImpact[] {
  const base = projectGoalDate(goals, currentSurplus, from);
  const alt = projectGoalDate(goals, scenarioSurplus, from);
  return base.map((b, i) => {
    const a = alt[i];
    const delta = b.months !== null && a.months !== null ? a.months - b.months : null;
    let message: string;
    if (b.months === null || a.months === null) message = "Not enough data to project this goal.";
    else if (delta === 0) message = "No change to this goal's timeline.";
    else if ((delta as number) > 0) message = `Goal delayed by approximately ${delta} month${delta === 1 ? "" : "s"}.`;
    else message = `Goal reached approximately ${Math.abs(delta as number)} month${Math.abs(delta as number) === 1 ? "" : "s"} earlier.`;
    return {
      goalId: b.goalId,
      name: b.name,
      currentMonths: b.months,
      scenarioMonths: a.months,
      currentLabel: b.label,
      scenarioLabel: a.label,
      deltaMonths: delta,
      message,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Scenario comparison                                                */
/* ------------------------------------------------------------------ */

export type PathResult = {
  label: string;
  cashFlow: CashFlow;
  netWorth: NetWorthProjection;
};

export type ComparisonRow = {
  label: string;
  current: string;
  scenario: string;
  /** Raw numeric difference (scenario − current) when meaningful. */
  delta?: number;
  /** Whether a positive delta is good news. */
  higherIsBetter?: boolean;
};

export type ScenarioResult = {
  months: number;
  current: PathResult;
  scenario: PathResult;
  rows: ComparisonRow[];
  goals: GoalImpact[];
  assumptions: Array<{ label: string; value: string }>;
  warnings: string[];
  keyImpacts: string[];
};

/** Generic comparison of two already-computed paths. */
export function compareScenarios(current: PathResult, scenario: PathResult) {
  return {
    surplusDelta: round(scenario.cashFlow.surplus - current.cashFlow.surplus),
    netWorthDelta: round(scenario.netWorth.netWorth - current.netWorth.netWorth),
    debtDelta: round(scenario.netWorth.debt - current.netWorth.debt),
    investmentDelta: round(scenario.netWorth.investments - current.netWorth.investments),
  };
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const signedINR = (n: number) => `${n >= 0 ? "+" : "−"}${inr(Math.abs(n))}`;

/* ---------------- Scenario A — new EMI ---------------- */

export type NewEmiInputs = {
  purchaseAmount: number;
  downPayment: number;
  emi: number;
  annualRate: number;
  tenureMonths: number;
  years: ProjectionYears;
  expectedReturn: number;
};

export function runNewEmiScenario(s: FinanceSnapshot, i: NewEmiInputs, from: { year: number; month: number }): ScenarioResult {
  const months = i.years * 12;
  const loanAmount = Math.max(0, i.purchaseAmount - i.downPayment);
  const newLoan: ScenarioLiability = {
    id: "hypothetical",
    name: "New loan",
    balance: loanAmount,
    rate: i.annualRate,
    emi: i.emi,
    remainingMonths: i.tenureMonths,
  };
  const loanOverTenure = projectLoanBalance(loanAmount, i.annualRate, i.emi, Math.max(i.tenureMonths, months));

  const currentFlow = projectCashFlow(s);
  const scenarioFlow = projectCashFlow(s, { emi: i.emi });

  const base = {
    cash: s.totalBalance,
    investments: s.totalInvestments,
    otherAssets: Math.max(0, s.totalAssets - s.totalInvestments),
    monthlyInvestment: s.monthlyInvestment,
    annualReturn: i.expectedReturn,
    months,
  };
  const currentNW = projectNetWorth({ ...base, debts: s.liabilities, monthlySurplus: currentFlow.surplus });
  const scenarioNW = projectNetWorth({
    ...base,
    // The down payment leaves the wallet today.
    cash: s.totalBalance - i.downPayment,
    debts: [...s.liabilities, newLoan],
    monthlySurplus: scenarioFlow.surplus,
  });

  const goals = compareGoals(s.goals, currentFlow.surplus, scenarioFlow.surplus, from);
  const diff = compareScenarios(
    { label: "Current path", cashFlow: currentFlow, netWorth: currentNW },
    { label: "With new EMI", cashFlow: scenarioFlow, netWorth: scenarioNW },
  );

  const warnings: string[] = [];
  if (i.emi > currentFlow.surplus) {
    warnings.push(
      `This EMI of ${inr(i.emi)} is larger than your current monthly surplus of ${inr(currentFlow.surplus)}. Taking it on would put your monthly cash flow into deficit.`,
    );
  } else if (i.emi > currentFlow.surplus * 0.5) {
    warnings.push(
      `This EMI would consume more than half of your monthly surplus, leaving little room for savings or unexpected costs.`,
    );
  }
  if (i.downPayment > s.totalBalance) {
    warnings.push(`The down payment of ${inr(i.downPayment)} is more than your current liquid balance of ${inr(s.totalBalance)}.`);
  }
  if (loanOverTenure.payoffMonths === null) {
    warnings.push("At this EMI the loan does not clear within the tenure entered — check the EMI, rate or tenure.");
  }

  return {
    months,
    current: { label: "Current path", cashFlow: currentFlow, netWorth: currentNW },
    scenario: { label: "With new EMI", cashFlow: scenarioFlow, netWorth: scenarioNW },
    rows: [
      { label: "Monthly surplus", current: inr(currentFlow.surplus), scenario: inr(scenarioFlow.surplus), delta: diff.surplusDelta, higherIsBetter: true },
      { label: "Monthly EMI outgo", current: inr(currentFlow.emi), scenario: inr(scenarioFlow.emi), delta: scenarioFlow.emi - currentFlow.emi, higherIsBetter: false },
      { label: `${i.years}-year projected net worth`, current: inr(currentNW.netWorth), scenario: inr(scenarioNW.netWorth), delta: diff.netWorthDelta, higherIsBetter: true },
      { label: `Debt remaining after ${i.years}y`, current: inr(currentNW.debt), scenario: inr(scenarioNW.debt), delta: diff.debtDelta, higherIsBetter: false },
      { label: "Estimated total interest on this loan", current: inr(0), scenario: inr(loanOverTenure.totalInterest), delta: loanOverTenure.totalInterest, higherIsBetter: false },
    ],
    goals,
    assumptions: [
      { label: "Loan amount", value: inr(loanAmount) },
      { label: "Loan interest", value: `${i.annualRate}% annually` },
      { label: "EMI", value: `${inr(i.emi)} / month` },
      { label: "Tenure", value: `${i.tenureMonths} months` },
      { label: "Projection", value: `${i.years} year${i.years === 1 ? "" : "s"}` },
      { label: "Assumed investment return", value: `${i.expectedReturn}% annually (estimated)` },
      { label: "Income & expenses", value: `Held at your recent average of ${inr(s.monthlyIncome)} in / ${inr(s.monthlyExpenses)} out` },
    ],
    warnings,
    keyImpacts: [
      `Monthly surplus changes by ${signedINR(diff.surplusDelta)} per month.`,
      `Estimated interest cost over the full tenure: ${inr(loanOverTenure.totalInterest)}.`,
      `Projected ${i.years}-year net worth differs by ${signedINR(diff.netWorthDelta)}.`,
    ],
  };
}

/* ---------------- Scenario B — increase investment ---------------- */

export type InvestMoreInputs = {
  additionalMonthly: number;
  expectedReturn: number;
  years: ProjectionYears;
};

export function runInvestMoreScenario(s: FinanceSnapshot, i: InvestMoreInputs, from: { year: number; month: number }): ScenarioResult {
  const months = i.years * 12;
  const currentFlow = projectCashFlow(s);
  const scenarioFlow = projectCashFlow(s, { investment: i.additionalMonthly });

  const base = {
    cash: s.totalBalance,
    investments: s.totalInvestments,
    otherAssets: Math.max(0, s.totalAssets - s.totalInvestments),
    debts: s.liabilities,
    annualReturn: i.expectedReturn,
    months,
  };
  const currentNW = projectNetWorth({ ...base, monthlyInvestment: s.monthlyInvestment, monthlySurplus: currentFlow.surplus });
  const scenarioNW = projectNetWorth({
    ...base,
    monthlyInvestment: s.monthlyInvestment + i.additionalMonthly,
    monthlySurplus: scenarioFlow.surplus,
  });

  const currentInv = projectInvestmentValue(s.totalInvestments, s.monthlyInvestment, i.expectedReturn, months);
  const scenarioInv = projectInvestmentValue(s.totalInvestments, s.monthlyInvestment + i.additionalMonthly, i.expectedReturn, months);

  const goals = compareGoals(s.goals, currentFlow.surplus, scenarioFlow.surplus, from);
  const diff = compareScenarios(
    { label: "Current path", cashFlow: currentFlow, netWorth: currentNW },
    { label: "Investing more", cashFlow: scenarioFlow, netWorth: scenarioNW },
  );

  const warnings: string[] = [];
  if (i.additionalMonthly > currentFlow.surplus) {
    warnings.push(
      `Investing an extra ${inr(i.additionalMonthly)} per month is more than your current monthly surplus of ${inr(currentFlow.surplus)} — you would need to cut spending or draw down savings.`,
    );
  }

  return {
    months,
    current: { label: "Current path", cashFlow: currentFlow, netWorth: currentNW },
    scenario: { label: "Investing more", cashFlow: scenarioFlow, netWorth: scenarioNW },
    rows: [
      { label: "Monthly investment", current: inr(currentFlow.investment), scenario: inr(scenarioFlow.investment), delta: i.additionalMonthly, higherIsBetter: true },
      { label: "Monthly surplus", current: inr(currentFlow.surplus), scenario: inr(scenarioFlow.surplus), delta: diff.surplusDelta, higherIsBetter: true },
      { label: `${i.years}-year investment value`, current: inr(currentInv.futureValue), scenario: inr(scenarioInv.futureValue), delta: round(scenarioInv.futureValue - currentInv.futureValue), higherIsBetter: true },
      { label: "Estimated growth (not contributions)", current: inr(currentInv.growth), scenario: inr(scenarioInv.growth), delta: round(scenarioInv.growth - currentInv.growth), higherIsBetter: true },
      { label: `${i.years}-year projected net worth`, current: inr(currentNW.netWorth), scenario: inr(scenarioNW.netWorth), delta: diff.netWorthDelta, higherIsBetter: true },
    ],
    goals,
    assumptions: [
      { label: "Additional monthly investment", value: inr(i.additionalMonthly) },
      { label: "Assumed return", value: `${i.expectedReturn}% annually (estimated, not guaranteed)` },
      { label: "Projection", value: `${i.years} year${i.years === 1 ? "" : "s"}` },
      { label: "Existing invested capital", value: inr(s.totalInvestments) },
      { label: "Existing monthly investing", value: `${inr(s.monthlyInvestment)} / month` },
    ],
    warnings,
    keyImpacts: [
      `Investments could be ${signedINR(round(scenarioInv.futureValue - currentInv.futureValue))} higher after ${i.years} year${i.years === 1 ? "" : "s"} (estimated).`,
      `Monthly cash left over drops by ${inr(i.additionalMonthly)}.`,
      `Projected net worth differs by ${signedINR(diff.netWorthDelta)}.`,
    ],
  };
}

/* ---------------- Scenario C — invest vs prepay ---------------- */

export type InvestVsPrepayInputs = {
  liabilityId: string;
  amount: number;
  expectedReturn: number;
  years: ProjectionYears;
};

export function runInvestVsPrepayScenario(
  s: FinanceSnapshot,
  i: InvestVsPrepayInputs,
  from: { year: number; month: number },
): ScenarioResult | null {
  const liability = s.liabilities.find((l) => l.id === i.liabilityId);
  if (!liability) return null;
  const months = i.years * 12;
  const others = s.liabilities.filter((l) => l.id !== liability.id);
  const impact = prepaymentImpact(liability, i.amount, months);

  const flow = projectCashFlow(s);
  // Prepaying may clear the loan early, freeing its EMI for the remaining months.
  const prepaidFreedMonths =
    impact.prepaid.payoffMonths !== null ? Math.max(0, months - impact.prepaid.payoffMonths) : 0;
  const baseFreedMonths = impact.base.payoffMonths !== null ? Math.max(0, months - impact.base.payoffMonths) : 0;
  const emiFreedExtra = round(((prepaidFreedMonths - baseFreedMonths) * liability.emi) / Math.max(1, months));

  const shared = {
    otherAssets: Math.max(0, s.totalAssets - s.totalInvestments),
    monthlyInvestment: s.monthlyInvestment,
    annualReturn: i.expectedReturn,
    months,
  };

  // Option A — prepay: cash drops by the amount, the loan shrinks.
  const prepayNW = projectNetWorth({
    ...shared,
    cash: s.totalBalance - i.amount,
    investments: s.totalInvestments,
    debts: [...others, { ...liability, balance: Math.max(0, liability.balance - i.amount) }],
    monthlySurplus: flow.surplus + emiFreedExtra,
  });
  // Option B — invest: cash drops by the amount, investments rise by it.
  const investNW = projectNetWorth({
    ...shared,
    cash: s.totalBalance - i.amount,
    investments: s.totalInvestments + i.amount,
    debts: s.liabilities,
    monthlySurplus: flow.surplus,
  });

  const lumpSum = projectInvestmentValue(i.amount, 0, i.expectedReturn, months);
  const prepayFlow = { ...flow, surplus: round(flow.surplus + emiFreedExtra) };
  const goals = compareGoals(s.goals, prepayFlow.surplus, flow.surplus, from);
  const netWorthDelta = round(investNW.netWorth - prepayNW.netWorth);

  return {
    months,
    current: { label: "Option A — prepay debt", cashFlow: prepayFlow, netWorth: prepayNW },
    scenario: { label: "Option B — invest instead", cashFlow: flow, netWorth: investNW },
    rows: [
      { label: "Interest saved on the loan", current: inr(impact.interestSaved), scenario: inr(0), delta: -impact.interestSaved, higherIsBetter: true },
      { label: `Loan balance after ${i.years}y`, current: inr(impact.prepaid.endingBalance), scenario: inr(impact.base.endingBalance), delta: round(impact.base.endingBalance - impact.prepaid.endingBalance), higherIsBetter: false },
      { label: `Value of the ${inr(i.amount)} after ${i.years}y`, current: inr(0), scenario: inr(lumpSum.futureValue), delta: lumpSum.futureValue, higherIsBetter: true },
      { label: "Estimated investment gain", current: inr(0), scenario: inr(lumpSum.growth), delta: lumpSum.growth, higherIsBetter: true },
      { label: "Average monthly surplus", current: inr(prepayFlow.surplus), scenario: inr(flow.surplus), delta: round(flow.surplus - prepayFlow.surplus), higherIsBetter: true },
      { label: `${i.years}-year projected net worth`, current: inr(prepayNW.netWorth), scenario: inr(investNW.netWorth), delta: netWorthDelta, higherIsBetter: true },
    ],
    goals,
    assumptions: [
      { label: "Liability", value: `${liability.name} — ${inr(liability.balance)} at ${liability.rate}%` },
      { label: "One-time amount", value: inr(i.amount) },
      { label: "Assumed investment return", value: `${i.expectedReturn}% annually (estimated, not guaranteed)` },
      { label: "Loan interest", value: `${liability.rate}% annually` },
      { label: "EMI", value: `${inr(liability.emi)} / month (unchanged)` },
      { label: "Projection", value: `${i.years} year${i.years === 1 ? "" : "s"}` },
    ],
    warnings: [
      "Investment returns are assumed, not guaranteed. Interest saved by prepaying is a certain saving; investment gains are not.",
      ...(i.amount > s.totalBalance
        ? [`This amount is more than your current liquid balance of ${inr(s.totalBalance)}.`]
        : []),
    ],
    keyImpacts: [
      netWorthDelta >= 0
        ? `Under these assumptions, investing ends ${inr(Math.abs(netWorthDelta))} ahead of prepaying after ${i.years} year${i.years === 1 ? "" : "s"}.`
        : `Under these assumptions, prepaying ends ${inr(Math.abs(netWorthDelta))} ahead of investing after ${i.years} year${i.years === 1 ? "" : "s"}.`,
      `Prepaying saves an estimated ${inr(impact.interestSaved)} of interest${impact.monthsSaved && impact.monthsSaved > 0 ? ` and clears the loan about ${impact.monthsSaved} months sooner` : ""}.`,
      `Investing the same amount could grow to ${inr(lumpSum.futureValue)} (estimated).`,
    ],
  };
}