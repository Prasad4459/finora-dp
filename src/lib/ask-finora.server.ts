// Ask Finora — server-only context builder and AI call.
//
// SAFETY: this module performs READS ONLY. It never inserts, updates or deletes
// anything, and it never uses a service-role client: every query runs through
// the RLS-scoped client created by `requireSupabaseAuth`, so a request can only
// ever see the signed-in user's own rows.
//
// It does not calculate finance figures of its own: every number comes from the
// existing pure services (`services/finance.ts`) or the Release 5 What-If
// scenario engine (`services/scenario-engine.ts`).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  addAggregates,
  computeHealthScore,
  computeTotals,
  emptyMonthAggregate,
  monthMetrics,
  netWorthChange,
  INVESTMENT_ASSET_TYPES,
  WALLET_MIRRORED_ASSET_TYPES,
  type MonthAggregate,
  type MonthMetrics,
} from "@/services/finance";
import {
  PROJECTION_YEARS,
  emiFor,
  emptySnapshot,
  runInvestMoreScenario,
  runInvestVsPrepayScenario,
  runNewEmiScenario,
  projectGoalDate,
  type FinanceSnapshot,
  type ProjectionYears,
  type ScenarioResult,
} from "@/services/scenario-engine";
import {
  assessAffordability,
  comfortableEmiCeiling,
  emiForPurchase,
  runDebtFreeScenario,
  runTargetReachScenario,
  type AffordabilityResult,
  type DebtFreeResult,
  type TargetReachResult,
} from "@/services/decision-engine";
import {
  addMonths,
  currentMonth,
  lastMonths,
  monthKeyOf,
  monthLongLabel,
  monthRange,
  todayISO,
  type MonthRef,
} from "@/lib/date-in";
import {
  buildMarketContext,
  type MarketContext,
  type ValuationPoint,
} from "@/services/market-context";
import type { Asset } from "@/types/finance";

type Db = SupabaseClient<Database>;

/* ------------------------------------------------------------------ */
/* Enum -> display label (mapping only, no calculation)                */
/* ------------------------------------------------------------------ */

const WALLET_LABEL: Record<string, string> = {
  bank_account: "Savings",
  cash: "Cash",
  upi_wallet: "UPI Wallet",
  credit_card: "Credit Card",
  investment_account: "Investment Account",
  loan_account: "Loan Account",
};

const ASSET_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  fixed_deposit: "FD",
  recurring_deposit: "RD",
  gold: "Gold",
  silver: "Silver",
  digital_gold: "Digital Gold",
  gold_etf: "Gold ETF",
  gold_fund: "Gold Fund",
  sovereign_gold_bond: "Sovereign Gold Bond",
  stocks: "Stocks",
  mutual_fund: "Mutual Funds",
  etf: "ETF",
  bond: "Bonds",
  reit: "REIT",
  invit: "InvIT",
  ppf: "PPF",
  epf: "EPF",
  nps: "NPS",
  sukanya_samriddhi: "Sukanya Samriddhi",
  nsc: "NSC",
  kvp: "KVP",
  scss: "SCSS",
  post_office: "Post Office",
  property: "Property",
  vehicle: "Vehicle",
  crypto: "Crypto",
  other: "Other",
};

const num = (v: unknown) => Number(v ?? 0) || 0;

/* ------------------------------------------------------------------ */
/* Financial context                                                   */
/* ------------------------------------------------------------------ */

export type AskContext = {
  current: MonthRef;
  snapshot: FinanceSnapshot;
  /** Metrics of the current IST calendar month. */
  month: MonthMetrics;
  monthLabel: string;
  /** Last 6 months of headline metrics (aggregated by Postgres). */
  history: Array<{ label: string; income: number; expenses: number; savings: number; netWorthAdded: number }>;
  totals: ReturnType<typeof computeTotals>;
  health: ReturnType<typeof computeHealthScore>;
  goals: Array<{ id: string; name: string; target: number; saved: number; remaining: number; targetDate: string | null }>;
  budgets: Array<{ name: string; budget: number; spent: number }>;
  bills: Array<{ name: string; amount: number; due: string }>;
  contributions: Array<{ name: string; amount: number; frequency: string; nextDue: string }>;
  topCategories: Array<{ name: string; spent: number }>;
  /** Market-valued holdings + valuation history (Release 7D). */
  market: MarketContext;
  /** Recorded activity for today (IST), by ledger type. Aggregates only. */
  today: {
    date: string;
    income: number;
    dividend: number;
    refund: number;
    expense: number;
    investment: number;
    redemption: number;
    emi: number;
    transfer: number;
    count: number;
  };
  hasData: boolean;
};

function aggregatesFromRows(rows: Array<Record<string, unknown>>): Map<string, MonthAggregate> {
  const map = new Map<string, MonthAggregate>();
  for (const r of rows) {
    const key = monthKeyOf({ year: Number(r['y']), month: Number(r['m']) });
    const agg = map.get(key) ?? emptyMonthAggregate(key);
    const total = num(r['total']);
    switch (String(r['tx_type'])) {
      case "income": agg.income += total; break;
      case "dividend": agg.dividend += total; break;
      case "refund": agg.refund += total; break;
      case "expense": agg.expense += total; break;
      case "investment": agg.investment += total; break;
      case "transfer": agg.transfer += total; break;
      case "emi":
        agg.emi += total;
        agg.emiInterest += num(r['interest_total']);
        agg.emiPrincipal += num(r['principal_total']);
        break;
    }
    map.set(key, agg);
  }
  return map;
}

/** Reads the signed-in user's position. RLS scopes every query to that user. */
export async function buildAskContext(supabase: Db): Promise<AskContext> {
  const current = currentMonth();
  const months = lastMonths(6);
  const from = monthRange(addMonths(current, -5)).from;
  const to = monthRange(current).to;
  const today = todayISO();
  const horizon = monthRange(addMonths(current, 1)).to;

  const [walletsRes, assetsRes, liabRes, goalsRes, budgetsRes, billsRes, contribRes, summaryRes, catRes, valuationsRes, todayRes] =
    await Promise.all([
      supabase.from("wallets").select("name, type, balance, is_active"),
      supabase
        .from("assets")
        .select(
          "id, name, type, purchase_value, current_value, quantity, units, avg_cost, last_price, last_price_at, interest_rate, compounding, maturity_date, purchase_date, created_at, symbol, exchange, price_source, price_unit, institution, is_active",
        ),
      supabase
        .from("liabilities")
        .select("id, name, type, outstanding_balance, interest_rate, emi_amount, remaining_months, status"),
      supabase.from("goals").select("id, name, target_amount, saved_amount, target_date, status"),
      supabase
        .from("budgets")
        .select("name, amount, category_id, period_year, period_month")
        .eq("period_year", current.year)
        .eq("period_month", current.month),
      supabase
        .from("bills")
        .select("name, amount, due_date, status")
        .gte("due_date", today)
        .lte("due_date", horizon)
        .order("due_date", { ascending: true })
        .limit(10),
      supabase
        .from("investment_contributions")
        .select("amount, frequency, next_due_date, status, assets(name)")
        .eq("status", "active")
        .limit(20),
      supabase.rpc("tx_summary_monthly", { _from: from, _to: to }),
      supabase.rpc("tx_category_monthly", { _from: monthRange(current).from, _to: to }),
      supabase
        .from("asset_valuations")
        .select("asset_id, as_of, value")
        .order("as_of", { ascending: false })
        .limit(400),
      supabase.from("transactions").select("type, amount").eq("transaction_date", today),
    ]);

  const firstError = [walletsRes, assetsRes, liabRes, goalsRes, budgetsRes, billsRes, contribRes, summaryRes, catRes, valuationsRes, todayRes]
    .map((r) => r.error)
    .find(Boolean);
  if (firstError) throw new Error(`[ask-finora] ${firstError.message}`);

  const accounts = (walletsRes.data ?? [])
    .filter((w) => w.is_active !== false)
    .map((w) => ({
      id: "",
      name: w.name,
      bank: "",
      type: WALLET_LABEL[w.type] ?? "Savings",
      balance: num(w.balance),
      icon: undefined as never,
      color: "",
      updated: "",
    }));

  // Full asset shape so valuation uses the SAME assetCurrentValue() path as the
  // Investments page (units × NAV for market assets, accrual for deposits).
  const assets: Asset[] = (assetsRes.data ?? [])
    .filter((a) => a.is_active !== false)
    .map((a) => {
      const x = a as Record<string, unknown>;
      const opt = (v: unknown) => (v === null || v === undefined ? null : Number(v));
      return {
        id: String(x['id'] ?? ""),
        name: a.name,
        type: ASSET_LABEL[a.type] ?? "Other",
        purchase: num(x['purchase_value']),
        current: num(a.current_value),
        date: String(x['purchase_date'] ?? x['created_at'] ?? today).slice(0, 10),
        units: opt(x['units'] ?? x['quantity']),
        avgCost: opt(x['avg_cost']),
        lastPrice: opt(x['last_price']),
        rate: opt(x['interest_rate']),
        compounding: (x['compounding'] as string | null) ?? null,
        maturityDate: (x['maturity_date'] as string | null) ?? null,
        institution: (x['institution'] as string | null) ?? null,
        symbol: (x['symbol'] as string | null) ?? null,
        exchange: (x['exchange'] as string | null) ?? null,
        priceSource: (x['price_source'] as string | null) ?? "manual",
        priceUnit: (x['price_unit'] as string | null) ?? "per_unit",
        lastPriceAt: (x['last_price_at'] as string | null) ?? null,
        isActive: true,
      } satisfies Asset;
    });

  const valuations: ValuationPoint[] = (valuationsRes.data ?? []).map((v) => ({
    assetId: String((v as Record<string, unknown>)['asset_id'] ?? ""),
    asOf: String((v as Record<string, unknown>)['as_of'] ?? "").slice(0, 10),
    value: num((v as Record<string, unknown>)['value']),
  }));
  const market = buildMarketContext(assets, valuations, today);

  const todayRows = (todayRes.data ?? []) as Array<{ type: string; amount: unknown }>;
  const sumToday = (type: string) =>
    Math.round(todayRows.filter((r) => r.type === type).reduce((s, r) => s + num(r.amount), 0));
  const todayActivity = {
    date: today,
    income: sumToday("income"),
    dividend: sumToday("dividend"),
    refund: sumToday("refund"),
    expense: sumToday("expense"),
    investment: sumToday("investment"),
    redemption: sumToday("redemption"),
    emi: sumToday("emi"),
    transfer: sumToday("transfer"),
    count: todayRows.length,
  };

  const liabilities = (liabRes.data ?? [])
    .filter((l) => l.status !== "closed")
    .map((l) => ({
      id: l.id,
      name: l.name,
      type: String(l.type),
      balance: num(l.outstanding_balance),
      rate: num(l.interest_rate),
      emi: num(l.emi_amount),
      due: "",
      remaining: Number(l.remaining_months ?? 0),
      status: String(l.status),
    }));

  const aggregates = aggregatesFromRows((summaryRes.data ?? []) as Array<Record<string, unknown>>);
  const series = months.map((ref) => {
    const key = monthKeyOf(ref);
    return { ref, metrics: monthMetrics(aggregates.get(key) ?? emptyMonthAggregate(key)) };
  });
  const month = series[series.length - 1].metrics;

  const totals = computeTotals({ accounts, assets, liabilities, month });
  const health = computeHealthScore(totals);

  // Averages over the months that actually have activity — same rule the
  // What-If page uses, so the simulator and the copilot agree.
  const active = series.filter((s) => s.metrics.grossIncome > 0 || s.metrics.cashOutflow > 0);
  const used = active.length > 0 ? active : series.slice(-1);
  const avg = (pick: (m: MonthMetrics) => number) =>
    Math.round(used.reduce((sum, s) => sum + pick(s.metrics), 0) / used.length);

  const goals = (goalsRes.data ?? [])
    .filter((g) => g.status !== "achieved" || num(g.saved_amount) < num(g.target_amount))
    .map((g) => ({
      id: g.id,
      name: g.name,
      target: num(g.target_amount),
      saved: num(g.saved_amount),
      remaining: Math.max(0, num(g.target_amount) - num(g.saved_amount)),
      targetDate: g.target_date,
    }));

  const snapshot: FinanceSnapshot = {
    ...emptySnapshot(),
    totalBalance: totals.totalBalance,
    totalAssets: totals.totalAssets,
    totalInvestments: totals.totalInvestments,
    totalDebt: totals.totalDebt,
    netWorth: totals.netWorth,
    monthlyIncome: avg((m) => m.grossIncome),
    monthlyExpenses: avg((m) => m.consumptionExpense),
    monthlyEmi: totals.monthlyEmi,
    monthlyInvestment: avg((m) => m.investmentContribution),
    monthlySurplus: avg((m) => m.savings),
    monthsOfHistory: used.length,
    liabilities: liabilities.map((l) => ({
      id: l.id,
      name: l.name,
      balance: l.balance,
      rate: l.rate,
      emi: l.emi,
      remainingMonths: l.remaining,
    })),
    goals: goals.map((g) => ({ id: g.id, name: g.name, target: g.target, current: g.saved, targetDate: g.targetDate ?? undefined })),
  };

  const catRows = (catRes.data ?? []) as Array<Record<string, unknown>>;
  const spendByCategory = new Map<string, number>();
  for (const r of catRows) {
    const type = String(r['tx_type']);
    if (type !== "expense" && type !== "refund") continue;
    const name = String(r['category_name'] ?? "Uncategorised");
    const delta = type === "expense" ? num(r['total']) : -num(r['total']);
    spendByCategory.set(name, (spendByCategory.get(name) ?? 0) + delta);
  }
  const topCategories = [...spendByCategory.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, spent]) => ({ name, spent: Math.round(spent) }));

  const budgets = (budgetsRes.data ?? []).map((b) => {
    const spent = catRows
      .filter((r) => r['category_id'] === b.category_id && String(r['tx_type']) === "expense")
      .reduce((s, r) => s + num(r['total']), 0);
    return { name: b.name ?? "Budget", budget: num(b.amount), spent: Math.round(spent) };
  });

  const bills = (billsRes.data ?? [])
    .filter((b) => b.status !== "paid")
    .map((b) => ({ name: b.name, amount: num(b.amount), due: String(b.due_date) }));

  const contributions = (contribRes.data ?? []).map((c) => {
    const asset = (c as { assets?: { name?: string } | null }).assets;
    return {
      name: asset?.name ?? "Recurring contribution",
      amount: num(c.amount),
      frequency: String(c.frequency),
      nextDue: String(c.next_due_date),
    };
  });

  return {
    current,
    snapshot,
    month,
    monthLabel: monthLongLabel(current),
    history: series.map((s) => ({
      label: monthLongLabel(s.ref),
      income: Math.round(s.metrics.grossIncome),
      expenses: Math.round(s.metrics.consumptionExpense),
      savings: Math.round(s.metrics.savings),
      netWorthAdded: Math.round(netWorthChange(s.metrics)),
    })),
    totals,
    health,
    goals,
    budgets,
    bills,
    contributions,
    topCategories,
    market,
    today: todayActivity,
    hasData:
      accounts.length > 0 ||
      assets.length > 0 ||
      liabilities.length > 0 ||
      goals.length > 0 ||
      addAggregates(series.map((s) => aggregates.get(monthKeyOf(s.ref)) ?? emptyMonthAggregate())).income > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Question -> scenario (deterministic, engine-only numbers)           */
/* ------------------------------------------------------------------ */

const DEFAULT_RETURN = 10;
const DEFAULT_LOAN_RATE = 9.5;
const DEFAULT_TENURE = 60;
const DEFAULT_YEARS: ProjectionYears = PROJECTION_YEARS.includes(5) ? 5 : 1;

/** Pulls rupee amounts out of a question: "₹40,000", "2L", "50 lakh", "1.5cr", "20k". */
export function parseAmounts(question: string): number[] {
  const out: number[] = [];
  const re = /(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|lakh|l|thousand|k)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(question))) {
    const base = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(base)) continue;
    const unit = (m[2] ?? "").toLowerCase();
    let value = base;
    if (unit.startsWith("cr")) value = base * 1e7;
    else if (unit.startsWith("l")) value = base * 1e5;
    else if (unit === "k" || unit === "thousand") value = base * 1000;
    // Bare small numbers (years, percentages, counts) are not money.
    if (!unit && base < 1000) continue;
    out.push(Math.round(value));
  }
  return out;
}

export type Intent =
  | "target_reach"
  | "affordability"
  | "invest_more"
  | "invest_vs_prepay"
  | "debt_free"
  | "financial_health"
  | "net_worth_change"
  | "market_performance"
  | "earned_today"
  | "general";

export function detectIntent(question: string): Intent {
  const q = question.toLowerCase();
  // Release 7D — factual market questions come first: they must never be
  // rerouted into a What-If projection.
  if (/(net worth).*(change|drop|fall|grow|increase|decrease)|why.*(net worth)/.test(q)) return "net_worth_change";
  if (/(earn|make|made|gain|profit|income).*(today)|today.*(earn|make|made|gain|profit)/.test(q)) {
    return /(invest|portfolio|mutual|fund|stock|etf|gold|market|nav)/.test(q) ? "market_performance" : "earned_today";
  }
  if (
    /(mutual fund|mutual funds|portfolio|holding|nav|market value|unrealised|unrealized)/.test(q) ||
    (/(invest|investment|investments|stock|stocks|etf|gold|crypto)/.test(q) &&
      /(gain|gained|lose|lost|loss|return|returns|worth|value|perform|performed|performance|\bup\b|\bdown\b|profit|changed|change)/.test(q))
  ) {
    return "market_performance";
  }
  if (/(prepay|pre-pay|pay off|payoff|foreclos|repay)/.test(q) && /(invest|sip|mutual|market)/.test(q)) {
    return "invest_vs_prepay";
  }
  if (/(debt[- ]?free|clear my loan|clear my debt|pay off my loan|loan free|finish my loan)/.test(q)) return "debt_free";
  if (/(afford|emi)/.test(q) && /(afford|emi|buy|take|car|bike|house|home|phone|laptop)/.test(q)) return "affordability";
  if (/(invest|sip|save)/.test(q) && /(more|extra|increase|additional|another)/.test(q)) return "invest_more";
  if (/(reach|hit|target|corpus|crore|lakh|how fast|when can i|when will i|how much should i invest)/.test(q)) {
    return "target_reach";
  }
  if (/(how am i|doing financially|health|weakest|improve|better|fix|optimi[sz]e|what should i)/.test(q)) {
    return "financial_health";
  }
  return "general";
}

/** "in 5 years", "within 18 months", "by 3 yrs" -> months. */
export function parseDeadlineMonths(question: string): number | null {
  const q = question.toLowerCase();
  const years = /(\d+(?:\.\d+)?)\s*(years?|yrs?|yr)\b/.exec(q);
  if (years) return Math.round(Number(years[1]) * 12);
  const months = /(\d+)\s*(months?|mos?)\b/.exec(q);
  if (months) return Number(months[1]);
  return null;
}

/** Does the question name an amount as a monthly figure? */
const looksMonthly = (q: string) => /(per month|a month|monthly|every month|\/month|p\.?m\.?|emi)/i.test(q);

/** Loan principal that produces this EMI — derived with the engine's own emiFor. */
function principalForEmi(emi: number, rate: number, tenure: number): number {
  let low = 0;
  let high = emi * tenure;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (emiFor(mid, rate, tenure) > emi) high = mid;
    else low = mid;
  }
  return Math.round(low);
}

export type Projection = {
  kind: string;
  title: string;
  result: ScenarioResult;
};

export type ScenarioOutcome = {
  projections: Projection[];
  /** Target-reach calculation (engine-composed), when the question names a target. */
  target?: TargetReachResult & { hypothetical: boolean; matchedGoal?: string };
  affordability?: AffordabilityResult;
  debtFree?: DebtFreeResult;
  /** Set when a scenario was clearly asked for but cannot be computed. */
  blocked?: string;
};

/** Runs the existing What-If engine. Never computes projections by hand. */
export function runScenariosFor(question: string, intent: Intent, ctx: AskContext): ScenarioOutcome {
  const s = ctx.snapshot;
  const from = ctx.current;
  const amounts = parseAmounts(question);
  const projections: Projection[] = [];

  const noHistory = s.monthsOfHistory === 0 || (s.monthlyIncome === 0 && s.monthlyExpenses === 0);
  const monthlyish = looksMonthly(question);

  try {
    if (intent === "affordability") {
      // "₹40,000 EMI" is a monthly figure; "a ₹20L car" is a purchase price.
      const named = amounts.find((a) => a >= 1000);
      if (!named) return { projections, blocked: "No amount was given, so affordability could not be assessed." };
      if (noHistory) return { projections, blocked: "There is no recorded income or spending history yet, so affordability cannot be projected." };
      const isPrice = !monthlyish && named >= 300000;
      const emi = isPrice ? emiForPurchase(named, DEFAULT_LOAN_RATE, DEFAULT_TENURE) : named;
      const principal = isPrice ? named : principalForEmi(emi, DEFAULT_LOAN_RATE, DEFAULT_TENURE);
      const affordability = assessAffordability(s, {
        emi,
        ...(isPrice ? { purchaseAmount: named } : {}),
        annualRate: DEFAULT_LOAN_RATE,
        tenureMonths: DEFAULT_TENURE,
      });
      projections.push({
        kind: "new_emi",
        title: `New EMI of ₹${emi.toLocaleString("en-IN")}`,
        result: runNewEmiScenario(
          s,
          {
            purchaseAmount: principal,
            downPayment: 0,
            emi,
            annualRate: DEFAULT_LOAN_RATE,
            tenureMonths: DEFAULT_TENURE,
            years: DEFAULT_YEARS,
            expectedReturn: DEFAULT_RETURN,
          },
          from,
        ),
      });
      return { projections, affordability };
    } else if (intent === "invest_vs_prepay") {
      const amount = amounts.find((a) => a >= 1000);
      const liability = s.liabilities.slice().sort((a, b) => b.balance - a.balance)[0];
      if (!amount) return { projections, blocked: "No amount was given, so invest-vs-prepay could not be compared." };
      if (!liability) return { projections, blocked: "No open loan is recorded, so there is nothing to prepay." };
      const result = runInvestVsPrepayScenario(s, { liabilityId: liability.id, amount, expectedReturn: DEFAULT_RETURN, years: DEFAULT_YEARS }, from);
      if (!result) return { projections, blocked: "The prepayment comparison could not be calculated for the recorded loans." };
      projections.push({ kind: "invest_vs_prepay", title: `₹${amount.toLocaleString("en-IN")} — invest vs prepay ${liability.name}`, result });
      return { projections, debtFree: runDebtFreeScenario(s, from) };
    } else if (intent === "debt_free") {
      if (s.liabilities.length === 0) {
        return { projections, blocked: "No open loans are recorded, so there is no debt timeline to project." };
      }
      return { projections, debtFree: runDebtFreeScenario(s, from) };
    } else if (intent === "target_reach") {
      if (noHistory) return { projections, blocked: "There is no recorded income or spending history yet, so a target timeline cannot be projected." };
      const target = amounts.filter((a) => a >= 100000).sort((a, b) => b - a)[0];
      if (!target) return { projections, blocked: "No target amount was given, so a target timeline could not be projected." };
      const deadlineMonths = parseDeadlineMonths(question);
      const matched = s.goals.find((g) => Math.abs(g.target - target) <= Math.max(1000, target * 0.02));
      const reach = runTargetReachScenario(s, { target, annualReturn: DEFAULT_RETURN, deadlineMonths }, from);
      // Also show the standard What-If comparison for the first accelerated path.
      const step = reach.paths.find((p) => p.additionalMonthly > 0);
      if (step) {
        projections.push({
          kind: "invest_more",
          title: investMoreTitle(step.additionalMonthly, s),
          result: runInvestMoreScenario(s, { additionalMonthly: step.additionalMonthly, expectedReturn: DEFAULT_RETURN, years: DEFAULT_YEARS }, from),
        });
      }
      return {
        projections,
        target: { ...reach, hypothetical: !matched, ...(matched ? { matchedGoal: matched.name } : {}) },
      };
    } else if (intent === "invest_more") {
      if (noHistory) return { projections, blocked: "There is no recorded income or spending history yet, so goal timelines cannot be projected." };
      const extra = amounts.find((a) => a >= 500 && a <= 500000) ?? Math.max(1000, Math.round(Math.max(0, s.monthlySurplus) * 0.25));
      projections.push({
        kind: "invest_more",
        title: investMoreTitle(extra, s),
        result: runInvestMoreScenario(s, { additionalMonthly: extra, expectedReturn: DEFAULT_RETURN, years: DEFAULT_YEARS }, from),
      });
    } else if (intent === "financial_health" && s.liabilities.length > 0) {
      return { projections, debtFree: runDebtFreeScenario(s, from) };
    }
  } catch (error) {
    return { projections: [], blocked: `The scenario engine could not complete this calculation (${(error as Error).message}).` };
  }

  return { projections };
}

/* ------------------------------------------------------------------ */
/* Suggested follow-ups (deterministic, engine-backed)                 */
/* ------------------------------------------------------------------ */

const money0 = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function followUpsFor(intent: Intent, ctx: AskContext, outcome: ScenarioOutcome): string[] {
  const s = ctx.snapshot;
  const out: string[] = [];
  if (outcome.target) {
    const t = outcome.target;
    out.push("What if I invest ₹10,000 more per month?");
    out.push(`What if I target ${money0(t.target)} in 5 years?`);
    out.push(`How much should I invest monthly to reach ${money0(t.target)} in 5 years?`);
  } else if (outcome.affordability) {
    const ceiling = comfortableEmiCeiling(s);
    out.push("What EMI can I comfortably afford?");
    if (ceiling > 0) out.push(`What if I choose a ${money0(ceiling)} EMI?`);
    if (s.goals[0]) out.push(`How will this affect my ${s.goals[0].name} goal?`);
    else out.push("When will I become debt free?");
  } else if (intent === "invest_vs_prepay") {
    out.push("What if I invest ₹1L instead?");
    out.push("How quickly can I become debt free?");
    out.push("What if I invest ₹20,000 more every month?");
  } else if (intent === "debt_free") {
    out.push("Should I invest ₹2L or prepay my loan?");
    out.push("What if I pay ₹10,000 more towards my loan every month?");
    out.push("How am I doing financially?");
  } else if (intent === "invest_more") {
    out.push("How can I reach ₹1 crore?");
    out.push("When will I become debt free?");
    out.push("What is my weakest financial area?");
  } else {
    out.push("How can I reach ₹50L?");
    if (s.liabilities.length > 0) out.push("When will I become debt free?");
    out.push("What if I invest ₹10,000 more every month?");
    out.push("Can I afford a ₹40,000 car EMI?");
  }
  return out.slice(0, 3);
}

/** Current-path goal timelines — engine output, used for planning answers. */
export function goalTimelines(ctx: AskContext) {
  return projectGoalDate(ctx.snapshot.goals, ctx.snapshot.monthlySurplus, ctx.current).map((g) => ({
    name: g.name,
    remaining: g.remaining,
    months: g.months,
    reachedBy: g.label,
    note: g.reason ?? null,
  }));
}

/* ------------------------------------------------------------------ */
/* Prompting                                                           */
/* ------------------------------------------------------------------ */

export const SYSTEM_PROMPT = `You are Ask Finora, the financial decision assistant inside Finora, a personal finance app for people in India.

You explain and interpret figures that have ALREADY been calculated for you by Finora's deterministic engines. You must never calculate, estimate or invent a financial number yourself.
- Every rupee figure, month count or date you state must appear in the CONTEXT block.
- If a number the user needs is not in the context, say plainly that you can't calculate that reliably yet, and say what they would need to record in Finora. Never guess.
- Amounts are Indian rupees; format them like ₹1,20,000.

ANSWER FORMAT — reply using only these section headings, each on its own line, in this order, omitting any section that has nothing useful to say:
SUMMARY
YOUR NUMBERS
OPTIONS
PROJECTED IMPACT
TRADE-OFF
RECOMMENDATION
ASSUMPTIONS

Under a heading, write short bullet lines starting with "- ". Where the line is one of the four kinds below, start it with the matching prefix followed by a colon:
- "FACT:" — a value taken from the user's actual Finora data.
- "PROJECTION:" — a figure produced by Finora's engines (PROJECTIONS / TARGET / AFFORDABILITY / DEBT sections of the context).
- "ASSUMPTION:" — an input a projection relies on, e.g. an assumed return rate.
- "RECOMMENDATION:" — your measured interpretation and suggested next step.
Use each prefix at most once per line, never in the middle of a sentence, and never invent other prefixes. SUMMARY is plain prose of one or two sentences with no prefix.

Rules:
- Never present a projection as guaranteed. Prefer "under these assumptions, X is projected to ..." over "X will ...".
- Never over-recommend. Do not write "definitely", "absolutely", "you should certainly", or promise wealth. Present the trade-off honestly, including risk, liquidity and the certainty of interest saved versus the uncertainty of investment returns.
- If the context says a target is hypothetical, say so explicitly in the SUMMARY, e.g. "I'll treat ₹50L as a hypothetical target because you haven't created a matching goal."
- Be concise — aim for under 250 words. No filler, no greetings, no markdown tables, no headings other than the ones listed.
- You cannot perform any action. Never offer to add, edit or delete anything. When the user should act, point them to the relevant Finora page: Investments, Goals, Liabilities, Bills & Reminders or What If?.
- No tax advice, no product or fund recommendations, no market predictions.`;

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Title for the invest-more projection. When the additional amount is the full monthly surplus, describe it as such. */
function investMoreTitle(additionalMonthly: number, s: FinanceSnapshot): string {
  const total = Math.round(s.monthlyInvestment + additionalMonthly);
  if (additionalMonthly > 0 && Math.abs(additionalMonthly - s.monthlySurplus) < 0.01) {
    return `Investing your full monthly surplus of ${money(s.monthlySurplus)} (${money(total)} total monthly investment)`;
  }
  return `Investing ${money(additionalMonthly)} more each month`;
}

export function buildContextBlock(ctx: AskContext, outcome: ScenarioOutcome): string {
  return buildContextLines(ctx, outcome).join("\n");
}

/** MARKET INVESTMENTS block — valuation facts only, never projections. */
function marketBlock(ctx: AskContext): string[] {
  const mkt = ctx.market;
  const lines: string[] = [];
  if (!mkt.hasMarketData) {
    lines.push("");
    lines.push(
      "MARKET INVESTMENTS: none recorded. There are no market-valued holdings (stocks, mutual funds, ETFs, gold), so there is no market valuation or unrealised gain to report.",
    );
    return lines;
  }
  lines.push("");
  lines.push(
    "MARKET INVESTMENTS — valuation FACTS from this user's own holdings. These are UNREALISED market values, not income and not cash:",
  );
  lines.push(
    `- Portfolio: invested ${money(mkt.invested)}, current market value ${money(mkt.value)}, unrealised gain/loss ${money(mkt.gain)} (${mkt.gainPct}%)`,
  );
  lines.push(
    mkt.valuationChange === null
      ? "- Market valuation change: NOT AVAILABLE — no holding has two recorded valuations yet, so the change since a previous valuation cannot be calculated. Never invent a previous price."
      : `- Market valuation change since the previous recorded valuation: ${money(mkt.valuationChange)}${mkt.valuationChangeToday === null ? " (the latest valuations were NOT recorded today, so do NOT call this today's change)" : ` (of which ${money(mkt.valuationChangeToday)} comes from valuations recorded today)`}`,
  );
  for (const h of mkt.holdings) {
    const id = [h.symbol ? `code ${h.symbol}` : null, h.exchange, `price source ${h.priceSource}`]
      .filter(Boolean)
      .join(", ");
    lines.push(
      `- ${h.name} (${h.type}${id ? `, ${id}` : ""}): ${h.units ?? "unknown"} units at ${h.price === null ? "no recorded price" : money(h.price)} per unit = current value ${money(h.value)}; invested ${money(h.invested)}; unrealised gain/loss ${money(h.gain)} (${h.gainPct}%)${h.lastPriceAt ? `; price last updated ${h.lastPriceAt.slice(0, 10)}` : "; price never updated"}`,
    );
    if (h.valuationChange === null) {
      lines.push(
        `  - Valuation history: ${h.latestValuationDate ? `only one valuation (${h.latestValuationDate}, ${money(h.latestValuationValue ?? 0)})` : "no recorded valuations"}. Say: current market value is ${money(h.value)}, but there is no previous valuation yet to calculate the change.`,
      );
    } else {
      lines.push(
        `  - Valuation history: ${h.previousValuationDate} ${money(h.previousValuationValue ?? 0)} -> ${h.latestValuationDate} ${money(h.latestValuationValue ?? 0)}; market valuation change ${money(h.valuationChange)}${h.changeIsToday ? " (latest valuation was recorded today)" : " (the latest valuation was NOT recorded today — describe it as the change between those two dates)"}`,
      );
    }
  }
  if (mkt.best) lines.push(`- Best performer by unrealised return: ${mkt.best.name} (${mkt.best.gainPct}%)`);
  if (mkt.worst) lines.push(`- Weakest performer by unrealised return: ${mkt.worst.name} (${mkt.worst.gainPct}%)`);
  return lines;
}

/** TODAY block — recorded ledger activity for the IST day, aggregates only. */
function todayBlock(ctx: AskContext): string[] {
  const t = ctx.today;
  const lines = ["", `TODAY'S RECORDED ACTIVITY (${t.date}, Asia/Kolkata) — TRANSACTIONS, not market movement:`];
  if (t.count === 0) {
    lines.push("- No transactions were recorded today: income ₹0, expenses ₹0, investment contributions ₹0.");
  } else {
    lines.push(`- Income ${money(t.income)}; dividends ${money(t.dividend)}; refunds ${money(t.refund)}`);
    lines.push(`- Expenses ${money(t.expense)}; EMI ${money(t.emi)}; transfers ${money(t.transfer)}`);
    lines.push(`- Investment contributions ${money(t.investment)}; redemptions ${money(t.redemption)}`);
  }
  lines.push(
    "- Investment contributions are money MOVED into investments, never profit. Market valuation change is NOT income and NOT a transaction.",
  );
  return lines;
}

function buildContextLines(ctx: AskContext, outcome: ScenarioOutcome): string[] {
  const s = ctx.snapshot;
  const lines: string[] = [];

  lines.push(`TODAY: ${todayISO()} (Asia/Kolkata). CURRENT MONTH: ${ctx.monthLabel}.`);
  lines.push("");
  lines.push("FACTS — calculated by Finora from this user's own data:");
  lines.push(`- Net worth: ${money(s.netWorth)}`);
  lines.push(`- Liquid balance across wallets: ${money(s.totalBalance)}`);
  lines.push(`- Assets (excluding wallet-mirrored cash): ${money(s.totalAssets)}, of which invested: ${money(s.totalInvestments)}`);
  lines.push(`- Total debt outstanding: ${money(s.totalDebt)}; monthly EMI commitment: ${money(s.monthlyEmi)}`);
  lines.push(`- This month (${ctx.monthLabel}): income ${money(ctx.month.grossIncome)}, expenses ${money(ctx.month.consumptionExpense)}, invested ${money(ctx.month.investmentContribution)}, savings ${money(ctx.month.savings)} (savings rate ${ctx.month.savingsRate}%)`);
  lines.push(`- Monthly averages over ${s.monthsOfHistory} month(s) with activity: income ${money(s.monthlyIncome)}, expenses ${money(s.monthlyExpenses)}, invested ${money(s.monthlyInvestment)}, surplus ${money(s.monthlySurplus)}`);
  lines.push(
    `- Health score: ${ctx.health.score}/100 (${ctx.health.label}); strongest area: ${ctx.health.strongest.label} (${ctx.health.strongest.detail}); weakest area: ${ctx.health.weakest.label} (${ctx.health.weakest.detail}); emergency runway ${ctx.health.runwayMonths} months`,
  );

  if (ctx.history.length) {
    lines.push("");
    lines.push("RECENT MONTHS (income / expenses / savings / net worth added):");
    for (const h of ctx.history) {
      lines.push(`- ${h.label}: ${money(h.income)} / ${money(h.expenses)} / ${money(h.savings)} / ${money(h.netWorthAdded)}`);
    }
  }

  if (ctx.topCategories.length) {
    lines.push("");
    lines.push("TOP SPENDING CATEGORIES THIS MONTH:");
    for (const c of ctx.topCategories) lines.push(`- ${c.name}: ${money(c.spent)}`);
  }

  lines.push(...marketBlock(ctx));
  lines.push(...todayBlock(ctx));

  if (s.liabilities.length) {
    lines.push("");
    lines.push("LOANS:");
    for (const l of s.liabilities) {
      lines.push(`- ${l.name}: outstanding ${money(l.balance)} at ${l.rate}% annually, EMI ${money(l.emi)}, ${l.remainingMonths || "unknown"} months remaining`);
    }
  }

  if (ctx.goals.length) {
    lines.push("");
    lines.push("GOALS (with engine-projected completion on the current surplus):");
    const timelines = goalTimelines(ctx);
    ctx.goals.forEach((g, index) => {
      const t = timelines[index];
      const eta = t?.months != null ? `projected complete ${t.reachedBy} (~${t.months} months)` : "not projectable on the current surplus";
      lines.push(`- ${g.name}: saved ${money(g.saved)} of ${money(g.target)} (${money(g.remaining)} to go)${g.targetDate ? `, target date ${g.targetDate}` : ""} — ${eta}`);
    });
  }

  if (ctx.budgets.length) {
    lines.push("");
    lines.push("BUDGETS THIS MONTH:");
    for (const b of ctx.budgets) lines.push(`- ${b.name}: spent ${money(b.spent)} of ${money(b.budget)}`);
  }

  if (ctx.bills.length) {
    lines.push("");
    lines.push("UPCOMING UNPAID BILLS:");
    for (const b of ctx.bills) lines.push(`- ${b.name}: ${money(b.amount)} due ${b.due}`);
  }

  if (ctx.contributions.length) {
    lines.push("");
    lines.push("RECURRING CONTRIBUTIONS:");
    for (const c of ctx.contributions) lines.push(`- ${c.name}: ${money(c.amount)} ${c.frequency}, next on ${c.nextDue}`);
  }

  if (outcome.projections.length) {
    lines.push("");
    lines.push("PROJECTIONS — produced by Finora's deterministic What-If engine. Quote these numbers exactly; do not recompute them:");
    for (const p of outcome.projections) {
      lines.push(`### ${p.title} (${p.result.months / 12}-year projection)`);
      for (const row of p.result.rows) lines.push(`- ${row.label}: current ${row.current} vs scenario ${row.scenario}`);
      for (const k of p.result.keyImpacts) lines.push(`- Key impact: ${k}`);
      for (const g of p.result.goals) lines.push(`- Goal "${g.name}": ${g.message}`);
      for (const w of p.result.warnings) lines.push(`- Warning: ${w}`);
      lines.push("ASSUMPTIONS used by this projection:");
      for (const a of p.result.assumptions) lines.push(`- ${a.label}: ${a.value}`);
    }
  } else if (outcome.blocked) {
    lines.push("");
    lines.push(`PROJECTION UNAVAILABLE: ${outcome.blocked} Tell the user you don't have enough information to calculate that yet, and what to record in Finora.`);
  }

  lines.push(...decisionBlocks(outcome));

  return lines;
}

/** Appends the Release 6 decision blocks. Called from buildContextBlock. */
function decisionBlocks(outcome: ScenarioOutcome): string[] {
  const lines: string[] = [];

  if (outcome.target) {
    const t = outcome.target;
    lines.push("");
    lines.push("TARGET REACH — calculated by Finora's engine. Quote these exactly:");
    lines.push(`- Target: ${money(t.target)}${t.hypothetical ? " (HYPOTHETICAL — the user has no matching goal in Finora; say this explicitly)" : ` (matches the existing goal "${t.matchedGoal}")`}`);
    lines.push(`- Current net worth: ${money(t.currentNetWorth)}; gap to target: ${money(t.gap)}`);
    for (const p of t.paths) {
      const when = p.months === null ? "not reached within 50 years" : `~${p.months} months, around ${p.reachedBy}`;
      lines.push(
        `- ${p.label}: ${when}; total monthly investing ${money(p.totalMonthlyInvestment)}; monthly surplus left ${money(p.monthlySurplusAfter)}${p.affordable ? "" : " (MORE than the current surplus — not affordable today)"}`,
      );
    }
    if (t.deadline) {
      const d = t.deadline;
      if (d.additionalMonthly === null) {
        lines.push(
          `- Deadline of ${d.months} months: NOT AFFORDABLE. Even investing every rupee of the current monthly surplus (total ${money(d.maxAffordableMonthly)} a month), the projection reaches only ${money(d.bestCaseNetWorth)} — a shortfall of ${money(d.shortfall)}. Say clearly that this target is not reachable in ${d.months} months on the current income and spending, and that it needs a longer horizon, a higher surplus or a smaller target.`,
        );
      } else {
        lines.push(
          `- To reach the target in ${d.months} months: invest ${money(d.totalMonthly ?? 0)} a month in total, which is ${money(d.additionalMonthly)} MORE than the existing monthly investing. Verified: feeding that amount back through the projection engine gives ${money(d.verifiedNetWorth ?? 0)} after ${d.months} months. This fits inside the current monthly surplus.`,
        );
      }
    }
    for (const n of t.notes) lines.push(`- Note: ${n}`);
    lines.push("ASSUMPTIONS behind this target calculation:");
    for (const a of t.assumptions) lines.push(`- ${a.label}: ${a.value}`);
  }

  if (outcome.affordability) {
    const a = outcome.affordability;
    lines.push("");
    lines.push("AFFORDABILITY — calculated by Finora's engine:");
    if (a.purchaseAmount !== undefined) lines.push(`- Purchase price considered: ${money(a.purchaseAmount)}, implying an EMI of ${money(a.emi)}`);
    lines.push(`- Proposed EMI: ${money(a.emi)}; existing EMI commitments: ${money(a.existingEmi)}`);
    lines.push(`- Current monthly surplus: ${money(a.currentSurplus)}; surplus after this EMI: ${money(a.surplusAfter)}`);
    if (a.emiToIncomeRatio !== null) lines.push(`- This EMI is ${a.emiToIncomeRatio}% of average monthly income; all EMIs together would be ${a.totalEmiToIncomeRatio}%`);
    lines.push(`- VERDICT: ${a.status}`);
    for (const r of a.reasons) lines.push(`- Reason: ${r}`);
    lines.push("ASSUMPTIONS behind this affordability check:");
    for (const x of a.assumptions) lines.push(`- ${x.label}: ${x.value}`);
  }

  if (outcome.debtFree) {
    const d = outcome.debtFree;
    lines.push("");
    lines.push("DEBT TIMELINE — calculated by Finora's engine:");
    lines.push(`- Total outstanding debt: ${money(d.totalDebt)}; monthly EMI: ${money(d.monthlyEmi)}`);
    lines.push(
      d.debtFreeMonths === null
        ? "- Debt-free date: cannot be projected from the recorded loans."
        : `- Projected debt free in ~${d.debtFreeMonths} months, around ${d.debtFreeBy}`,
    );
    for (const l of d.lines) {
      lines.push(
        `- ${l.name}: ${money(l.balance)} at ${l.rateKnown ? `${l.rate}%` : "an UNKNOWN interest rate"}, EMI ${money(l.emi)}, ${l.payoffMonths === null ? "payoff not projectable" : `clears in ~${l.payoffMonths} months (${l.payoffBy})`}${l.rateKnown ? `, total interest ${money(l.totalInterest)}` : ""}`,
      );
    }
    if (d.highestCost) lines.push(`- Highest-cost debt: ${d.highestCost}`);
    if (d.surplusPrepay) {
      const p = d.surplusPrepay;
      lines.push(
        `- If the whole monthly surplus of ${money(p.monthlyExtra)} went to that loan: ${p.payoffMonths === null ? "still not cleared within 50 years" : `it clears in ~${p.payoffMonths} months`}${p.monthsSaved ? `, about ${p.monthsSaved} months sooner` : ""}, saving about ${money(p.interestSaved)} of interest.`,
      );
    }
    for (const n of d.notes) lines.push(`- Note: ${n}`);
    lines.push("- Do not recommend prepayment purely because debt exists: weigh the interest rate, the emergency runway, liquidity and cash flow.");
    lines.push("ASSUMPTIONS behind this debt timeline:");
    for (const x of d.assumptions) lines.push(`- ${x.label}: ${x.value}`);
  }

  return lines;
}

/* ------------------------------------------------------------------ */
/* AI call                                                             */
/* ------------------------------------------------------------------ */

const MODEL = "google/gemini-3.5-flash";

/** Immediately preceding turns of this page session (never persisted). */
export type ChatTurn = { question: string; answer: string };

export async function askGateway(
  question: string,
  contextBlock: string,
  history: ChatTurn[] = [],
): Promise<string> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const priorMessages = history.slice(-2).flatMap((turn) => [
    { role: "user", content: turn.question },
    { role: "assistant", content: turn.answer.slice(0, 2000) },
  ]);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...priorMessages,
        { role: "user", content: `CONTEXT\n${contextBlock}\n\nQUESTION\n${question}` },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) throw new Error("Ask Finora is busy right now. Please try again in a moment.");
    if (response.status === 402) throw new Error("The AI usage limit for this workspace has been reached.");
    console.error("[ask-finora] gateway error", response.status, detail.slice(0, 500));
    throw new Error("Ask Finora is unavailable right now. Please try again.");
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Ask Finora couldn't produce an answer for that. Try rephrasing the question.");
  return text;
}

export const NOT_ENOUGH_DATA =
  "I don't have enough information to calculate that yet. Add your accounts, income and expenses in Finora and ask me again.";

export { INVESTMENT_ASSET_TYPES, WALLET_MIRRORED_ASSET_TYPES };
