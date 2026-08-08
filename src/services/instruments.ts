// Pure, React-free instrument metadata and valuation maths for the India
// investment domain. This is the single place that answers:
//   • which fields an instrument needs,
//   • which asset class it belongs to,
//   • how its current value should be derived.
// It never imports React, components or Supabase.

export type AssetClass = "equity" | "debt" | "small_savings" | "gold" | "alternative" | "physical" | "cash";

/** How an instrument's current value is arrived at. */
export type ValuationMode = "market" | "accrual" | "manual";

export type InstrumentMeta = {
  /** Display label, matching ASSET_TYPES in constants/finance.ts. */
  label: string;
  assetClass: AssetClass;
  valuation: ValuationMode;
  /** Unit / NAV based (mutual funds, stocks, ETFs, gold grams). */
  units: boolean;
  /** Carries a contractual interest rate. */
  rate: boolean;
  /** Has a maturity date (and optionally a maturity value). */
  maturity: boolean;
  /** Can have a recurring contribution schedule (SIP / RD / yearly). */
  schedule: boolean;
  /** Counts as invested capital rather than a physical holding. */
  investment: boolean;
};

const DEFAULT_META: InstrumentMeta = {
  label: "Other",
  assetClass: "alternative",
  valuation: "manual",
  units: false,
  rate: false,
  maturity: false,
  schedule: false,
  investment: false,
};

const m = (meta: Partial<InstrumentMeta> & { label: string }): InstrumentMeta => ({ ...DEFAULT_META, ...meta });

/** Keyed by the display label used across the UI. */
export const INSTRUMENTS: Record<string, InstrumentMeta> = {
  Cash: m({ label: "Cash", assetClass: "cash" }),
  Bank: m({ label: "Bank", assetClass: "cash" }),

  Stocks: m({ label: "Stocks", assetClass: "equity", valuation: "market", units: true, investment: true }),
  "Mutual Funds": m({ label: "Mutual Funds", assetClass: "equity", valuation: "market", units: true, schedule: true, investment: true }),
  ETF: m({ label: "ETF", assetClass: "equity", valuation: "market", units: true, schedule: true, investment: true }),
  REIT: m({ label: "REIT", assetClass: "alternative", valuation: "market", units: true, investment: true }),
  InvIT: m({ label: "InvIT", assetClass: "alternative", valuation: "market", units: true, investment: true }),
  Crypto: m({ label: "Crypto", assetClass: "alternative", valuation: "market", units: true, investment: true }),

  FD: m({ label: "FD", assetClass: "debt", valuation: "accrual", rate: true, maturity: true, investment: true }),
  RD: m({ label: "RD", assetClass: "debt", valuation: "accrual", rate: true, maturity: true, schedule: true, investment: true }),
  Bonds: m({ label: "Bonds", assetClass: "debt", valuation: "accrual", rate: true, maturity: true, investment: true }),

  PPF: m({ label: "PPF", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, schedule: true, investment: true }),
  EPF: m({ label: "EPF", assetClass: "small_savings", valuation: "accrual", rate: true, schedule: true, investment: true }),
  NPS: m({ label: "NPS", assetClass: "small_savings", valuation: "market", units: true, schedule: true, investment: true }),
  "Sukanya Samriddhi": m({ label: "Sukanya Samriddhi", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, schedule: true, investment: true }),
  NSC: m({ label: "NSC", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, investment: true }),
  KVP: m({ label: "KVP", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, investment: true }),
  SCSS: m({ label: "SCSS", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, investment: true }),
  "Post Office": m({ label: "Post Office", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, schedule: true, investment: true }),

  Gold: m({ label: "Gold", assetClass: "gold", valuation: "market", units: true, investment: true }),
  Silver: m({ label: "Silver", assetClass: "gold", valuation: "market", units: true, investment: true }),

  Property: m({ label: "Property", assetClass: "physical" }),
  Vehicle: m({ label: "Vehicle", assetClass: "physical" }),
  Other: DEFAULT_META,
};

export const instrumentMeta = (label: string): InstrumentMeta => INSTRUMENTS[label] ?? DEFAULT_META;

export const isInvestmentInstrument = (label: string) => instrumentMeta(label).investment;

/** Asset-type labels that can carry a recurring contribution (SIP/RD/yearly). */
export const SCHEDULABLE_INSTRUMENTS = Object.values(INSTRUMENTS)
  .filter((i) => i.schedule)
  .map((i) => i.label);

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  equity: "Equity",
  debt: "Debt",
  small_savings: "Small savings",
  gold: "Gold & silver",
  alternative: "Alternatives",
  physical: "Physical",
  cash: "Cash",
};

export const COMPOUNDING_OPTIONS = ["Yearly", "Half-yearly", "Quarterly", "Monthly", "None"] as const;

const PERIODS_PER_YEAR: Record<string, number> = {
  Yearly: 1,
  "Half-yearly": 2,
  Quarterly: 4,
  Monthly: 12,
  None: 0,
};

/** Whole years (fractional) between two ISO dates. */
export const yearsBetweenISO = (from: string, to: string) => {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, (b - a) / (365.25 * 86_400_000));
};

/**
 * PROJECTED value of an accrual instrument (FD / PPF / NSC / KVP / SCSS / SSY).
 *
 * This is DISPLAY ONLY. It never writes to the ledger and never becomes
 * income: accrued-but-uncredited interest must not inflate the savings rate.
 * Interest that is actually paid into a bank account should be recorded as a
 * normal income transaction instead.
 */
export function accruedValue(input: {
  principal: number;
  ratePct: number;
  fromISO: string;
  asOfISO: string;
  compounding?: string | null;
  maturityISO?: string | null;
}): number {
  const { principal, ratePct } = input;
  if (!(principal > 0) || !(ratePct > 0)) return principal || 0;
  // Interest stops accruing at maturity.
  const end =
    input.maturityISO && input.maturityISO < input.asOfISO ? input.maturityISO : input.asOfISO;
  const years = yearsBetweenISO(input.fromISO, end);
  if (years <= 0) return principal;
  const n = PERIODS_PER_YEAR[input.compounding ?? "Yearly"] ?? 1;
  const value = n === 0 ? principal * (1 + (ratePct / 100) * years) : principal * (1 + ratePct / 100 / n) ** (n * years);
  return Math.round(value);
}

/** Market value of a unit-based holding, when a last price is known. */
export const marketValue = (units: number | null, lastPrice: number | null) =>
  units && lastPrice ? Math.round(units * lastPrice) : null;

export type HoldingInput = {
  type: string;
  purchase: number;
  current: number;
  date: string;
  units?: number | null;
  lastPrice?: number | null;
  rate?: number | null;
  compounding?: string | null;
  maturityDate?: string | null;
};

/**
 * The value we SHOW for a holding. Stored `current_value` is always the
 * authoritative, ledger-backed figure; market price and accrual only refine
 * it when the user has supplied enough information.
 */
export function derivedValue(h: HoldingInput, asOfISO: string): number {
  const meta = instrumentMeta(h.type);
  if (meta.valuation === "market") return marketValue(h.units ?? null, h.lastPrice ?? null) ?? h.current;
  if (meta.valuation === "accrual" && h.rate)
    return accruedValue({
      principal: h.purchase || h.current,
      ratePct: Number(h.rate),
      fromISO: h.date,
      asOfISO,
      compounding: h.compounding,
      maturityISO: h.maturityDate,
    });
  return h.current;
}

export const gainOf = (value: number, invested: number) => ({
  gain: value - invested,
  pct: invested > 0 ? ((value - invested) / invested) * 100 : 0,
});