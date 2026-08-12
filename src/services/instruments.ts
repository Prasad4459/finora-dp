// Pure, React-free instrument metadata and valuation maths for the India
// investment domain. This is the single place that answers:
//   • which fields an instrument needs,
//   • which asset class it belongs to,
//   • how its current value should be derived.
// It never imports React, components or Supabase.

export type AssetClass = "equity" | "debt" | "small_savings" | "gold" | "alternative" | "physical" | "cash";

/** How an instrument's current value is arrived at. */
export type ValuationMode = "market" | "accrual" | "manual";

/** The unit a market price is quoted in. */
export type PriceUnit = "per_unit" | "per_gram";

/** Every field an instrument form can ask for. */
export type InstrumentField =
  | "institution"
  | "folio"
  | "symbol"
  | "exchange"
  | "priceSource"
  | "units"
  | "avgCost"
  | "lastPrice"
  | "purchase"
  | "current"
  | "rate"
  | "compounding"
  | "maturityDate"
  | "maturityValue"
  | "date";

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
  /** A market price per unit is meaningful. */
  price: boolean;
  /** Can be sold / withdrawn back into a wallet. */
  redeemable: boolean;
  /** Statutory lock-in in years, when one applies. */
  lockInYears?: number;
  /**
   * Unit a market price is quoted in for this instrument. Physical/digital
   * metal is priced per gram; funds, ETFs and bonds per unit.
   */
  priceUnit: PriceUnit;
  /** Can be funded by an employer (EPF / NPS) without a wallet outflow. */
  employerFunded?: boolean;
  /** Exact fields the dynamic form should render, in order. */
  fields: InstrumentField[];
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
  price: false,
  redeemable: false,
  priceUnit: "per_unit",
  fields: ["purchase", "current", "date"],
};

/** Field presets, so no component ever hard-codes instrument knowledge. */
const UNIT_FIELDS: InstrumentField[] = [
  "institution",
  "folio",
  "symbol",
  "exchange",
  "priceSource",
  "purchase",
  "units",
  "lastPrice",
  "date",
];
const DEPOSIT_FIELDS: InstrumentField[] = [
  "institution",
  "purchase",
  "rate",
  "compounding",
  "date",
  "maturityDate",
  "maturityValue",
  "current",
];
const SMALL_SAVINGS_FIELDS: InstrumentField[] = [
  "institution",
  "folio",
  "purchase",
  "rate",
  "compounding",
  "date",
  "maturityDate",
  "current",
];

const m = (meta: Partial<InstrumentMeta> & { label: string }): InstrumentMeta => {
  const merged = { ...DEFAULT_META, ...meta };
  // Units imply a market price unless explicitly overridden.
  if (meta.price === undefined) merged.price = merged.units;
  if (meta.redeemable === undefined) merged.redeemable = merged.investment;
  if (!meta.fields) {
    merged.fields = merged.units
      ? UNIT_FIELDS
      : merged.rate
        ? DEPOSIT_FIELDS
        : DEFAULT_META.fields;
  }
  return merged;
};

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

  PPF: m({ label: "PPF", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, schedule: true, investment: true, redeemable: false, lockInYears: 15, fields: SMALL_SAVINGS_FIELDS }),
  EPF: m({ label: "EPF", assetClass: "small_savings", valuation: "accrual", rate: true, schedule: true, investment: true, redeemable: false, employerFunded: true, fields: ["institution", "folio", "purchase", "rate", "compounding", "date", "current"] }),
  NPS: m({ label: "NPS", assetClass: "small_savings", valuation: "market", units: true, schedule: true, investment: true, redeemable: false, lockInYears: 60, employerFunded: true }),
  "Sukanya Samriddhi": m({ label: "Sukanya Samriddhi", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, schedule: true, investment: true, redeemable: false, lockInYears: 21, fields: SMALL_SAVINGS_FIELDS }),
  NSC: m({ label: "NSC", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, investment: true, lockInYears: 5, fields: SMALL_SAVINGS_FIELDS }),
  KVP: m({ label: "KVP", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, investment: true, lockInYears: 2.5, fields: SMALL_SAVINGS_FIELDS }),
  SCSS: m({ label: "SCSS", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, investment: true, lockInYears: 5, fields: SMALL_SAVINGS_FIELDS }),
  "Post Office": m({ label: "Post Office", assetClass: "small_savings", valuation: "accrual", rate: true, maturity: true, schedule: true, investment: true, fields: SMALL_SAVINGS_FIELDS }),

  Gold: m({ label: "Gold", assetClass: "gold", valuation: "market", units: true, investment: true, priceUnit: "per_gram" }),
  Silver: m({ label: "Silver", assetClass: "gold", valuation: "market", units: true, investment: true, priceUnit: "per_gram" }),
  "Digital Gold": m({ label: "Digital Gold", assetClass: "gold", valuation: "market", units: true, schedule: true, investment: true, priceUnit: "per_gram" }),
  "Gold ETF": m({ label: "Gold ETF", assetClass: "gold", valuation: "market", units: true, schedule: true, investment: true }),
  "Gold Fund": m({ label: "Gold Fund", assetClass: "gold", valuation: "market", units: true, schedule: true, investment: true }),
  "Sovereign Gold Bond": m({ label: "Sovereign Gold Bond", assetClass: "gold", valuation: "market", units: true, maturity: true, investment: true, lockInYears: 5, fields: ["institution", "folio", "purchase", "units", "lastPrice", "date", "maturityDate"] }),

  Property: m({ label: "Property", assetClass: "physical" }),
  Vehicle: m({ label: "Vehicle", assetClass: "physical" }),
  Other: DEFAULT_META,
};

export const instrumentMeta = (label: string): InstrumentMeta => INSTRUMENTS[label] ?? DEFAULT_META;

/**
 * AUTHORITATIVE PRICE UNIT for an instrument. Physical gold, digital gold and
 * silver are quoted per gram; everything else per unit. Stored metadata never
 * overrides this — it is only validated against it.
 */
export const instrumentPriceUnit = (label: string): PriceUnit => instrumentMeta(label).priceUnit;

/**
 * A stored / incoming price unit is usable only when it matches the
 * instrument's own convention. A missing value is treated as "unknown" and is
 * NOT assumed to match: callers preserve the last known value instead.
 */
export const priceUnitMatches = (label: string, unit: string | null | undefined): boolean =>
  typeof unit === "string" && unit.trim() !== "" && unit === instrumentPriceUnit(label);

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

/**
 * A price is only usable when it is a finite, strictly positive number.
 * Guards every valuation write: a null/zero/NaN price from a failed lookup
 * must never overwrite a good current value.
 */
export const isValidPrice = (p: unknown): p is number =>
  typeof p === "number" && Number.isFinite(p) && p > 0;

/** Market value of a unit-based holding, when a last price is known. */
export const marketValue = (units: number | null, lastPrice: number | null) =>
  units && lastPrice ? Math.round(units * lastPrice) : null;

export type HoldingInput = {
  type: string;
  purchase: number;
  current: number;
  date: string;
  units?: number | null;
  avgCost?: number | null;
  lastPrice?: number | null;
  rate?: number | null;
  compounding?: string | null;
  maturityDate?: string | null;
  /** Stored price_unit. When absent the instrument default is assumed. */
  priceUnit?: string | null;
};

/**
 * The value we SHOW for a holding. Stored `current_value` is always the
 * authoritative, ledger-backed figure; market price and accrual only refine
 * it when the user has supplied enough information.
 */
export function derivedValue(h: HoldingInput, asOfISO: string): number {
  const meta = instrumentMeta(h.type);
  if (meta.valuation === "market") {
    // PRICE-UNIT SAFETY. A per_gram price must never be multiplied into a
    // per_unit holding (or vice versa). When the stored unit disagrees with the
    // instrument's convention we keep the last known value instead of
    // inventing one.
    if (h.priceUnit != null && h.priceUnit !== "" && !priceUnitMatches(h.type, h.priceUnit)) {
      return h.current || h.purchase;
    }
    // A market price is only meaningful PER UNIT. When none is recorded we fall
    // back to average cost (value == invested, gain 0) — never to a stored
    // figure multiplied by units, which would inflate the portfolio.
    return (
      marketValue(h.units ?? null, h.lastPrice ?? null) ??
      marketValue(h.units ?? null, h.avgCost ?? null) ??
      (h.current || h.purchase)
    );
  }
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

/**
 * SINGLE SOURCE OF CURRENT VALUE.
 * Both the Investments page and the net-worth engine must call this — nothing
 * may read `asset.current` directly for display or totals.
 */
export const assetCurrentValue = (h: HoldingInput, asOfISO: string) => derivedValue(h, asOfISO);

export const gainOf = (value: number, invested: number) => ({
  gain: value - invested,
  pct: invested > 0 ? ((value - invested) / invested) * 100 : 0,
});