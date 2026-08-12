// Pure, React-free NET-WORTH RECONCILIATION service (Release 7D).
//
// WHY THIS EXISTS
// ---------------
// "Income − expenses" is NOT a net-worth change. Finora keeps three concepts
// strictly separate and this module is the only place that relates them:
//
//   1. CASH-FLOW ACTIVITY   income, expenses, contributions, withdrawals, EMI.
//   2. MARKET MOVEMENT      unrealised gains/losses from valuation changes.
//   3. NET-WORTH MOVEMENT   ending net worth − beginning net worth.
//
// ACCOUNTING RULES ENCODED HERE (do not "simplify" them):
//  • An investment contribution moves cash -> investments. Net worth unchanged.
//  • An investment withdrawal/redemption moves investments -> cash. Net worth
//    unchanged, and it is NEVER income.
//  • A market gain/loss changes net worth but is NEVER income or an expense.
//  • Loan principal repayment moves cash -> debt reduction. Net worth unchanged.
//  • Loan interest IS an expense and reduces net worth.
//  • Transfers (including goal contributions) never change net worth.
//  • If the components do not add up to the verified change, the remainder is
//    reported as an UNEXPLAINED difference. We never invent an explanation.

/** Recorded ledger totals for one period. All values are positive magnitudes. */
export type PeriodFlows = {
  income: number;
  dividend: number;
  refund: number;
  expense: number;
  /** Cash moved INTO investments (asset purchases / SIP instalments). */
  investmentContribution: number;
  /** Cash moved OUT of investments (redemptions). Never income. */
  investmentWithdrawal: number;
  /** Full EMI paid = principal + interest (as recorded). */
  emiPaid: number;
  emiInterest: number;
  emiPrincipal: number;
  /** Wallet-to-wallet movement, including goal contributions. Net-worth neutral. */
  transfer: number;
};

export const emptyFlows = (): PeriodFlows => ({
  income: 0,
  dividend: 0,
  refund: 0,
  expense: 0,
  investmentContribution: 0,
  investmentWithdrawal: 0,
  emiPaid: 0,
  emiInterest: 0,
  emiPrincipal: 0,
  transfer: 0,
});

export type ReconciliationInput = {
  /** Inclusive IST period boundaries, "YYYY-MM-DD". */
  from: string;
  to: string;
  label: string;
  /** Authoritative net worth at the end of the period (today's position). */
  endingNetWorth: number;
  /**
   * Verified net worth at the START of the period, when it is actually known.
   * Finora does not store net-worth snapshots, so this is usually null — in
   * that case the beginning figure is DERIVED from the components and clearly
   * flagged as derived, never presented as verified.
   */
  beginningNetWorth?: number | null;
  flows: PeriodFlows;
  /**
   * Market valuation gain/loss over the period, or null when there is not
   * enough valuation history to know. Null is NOT zero.
   */
  marketChange: number | null;
  /** Any other identifiable asset/liability change (revaluation, write-off). */
  otherChange?: number;
  /** Absolute rupee tolerance below which a difference is treated as rounding. */
  tolerance?: number;
};

export type ReconciliationComponent = {
  key:
    | "income"
    | "dividend"
    | "refund"
    | "expense"
    | "emi_interest"
    | "market"
    | "other";
  label: string;
  /** Signed effect on net worth. */
  effect: number;
  /** Plain-language reason this component does (or does not) move net worth. */
  note: string;
};

/** Movements that shift WHERE money sits without changing how much is owned. */
export type NeutralMovement = {
  key: "investment_contribution" | "investment_withdrawal" | "emi_principal" | "transfer";
  label: string;
  amount: number;
  note: string;
};

export type Reconciliation = {
  label: string;
  from: string;
  to: string;
  endingNetWorth: number;
  beginningNetWorth: number;
  /** True when beginningNetWorth was supplied rather than derived. */
  beginningIsVerified: boolean;
  /** ending − beginning. Null when the beginning figure is not verified. */
  verifiedChange: number | null;
  /** Sum of the identified components' effects. */
  explainedChange: number;
  components: ReconciliationComponent[];
  neutralMovements: NeutralMovement[];
  /** verifiedChange − explainedChange. Null when there is nothing to verify against. */
  unexplained: number | null;
  /** True only when a verified change exists AND the components explain it. */
  reconciles: boolean;
  /** True when market movement could not be measured (no valuation history). */
  marketChangeUnavailable: boolean;
  notes: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function reconcileNetWorth(input: ReconciliationInput): Reconciliation {
  const f = input.flows;
  const tolerance = input.tolerance ?? 1;
  const other = input.otherChange ?? 0;
  const marketUnavailable = input.marketChange === null;
  const market = input.marketChange ?? 0;

  const rawComponents: ReconciliationComponent[] = [
    {
      key: "income",
      label: "Recorded income",
      effect: f.income,
      note: "Salary and other recorded income increases net worth.",
    },
    {
      key: "dividend",
      label: "Dividends received",
      effect: f.dividend,
      note: "Dividends are recorded income, not a market valuation change.",
    },
    {
      key: "refund",
      label: "Refunds received",
      effect: f.refund,
      note: "A refund reverses an earlier outflow.",
    },
    {
      key: "expense",
      label: "Recorded expenses",
      effect: -f.expense,
      note: "Consumption spending reduces net worth.",
    },
    {
      key: "emi_interest",
      label: "Loan interest paid",
      effect: -f.emiInterest,
      note: "Interest is a finance cost (an expense); it is separated from principal.",
    },
    {
      key: "market",
      label: "Market valuation gain/loss",
      effect: market,
      note: marketUnavailable
        ? "Not measurable: there is not enough valuation history for this period. Treated as unknown, not zero."
        : "Unrealised movement in investment value. Never income, never an expense.",
    },
    {
      key: "other",
      label: "Other asset/liability changes",
      effect: other,
      note: "Any identified revaluation of assets or liabilities outside the ledger.",
    },
  ];
  const components: ReconciliationComponent[] = rawComponents.map((c) => ({
    ...c,
    effect: r2(c.effect),
  }));

  const neutralMovements: NeutralMovement[] = [
    {
      key: "investment_contribution",
      label: "Invested into holdings",
      amount: r2(f.investmentContribution),
      note: "Cash moved into investments. This is a transfer, NOT a reduction in net worth.",
    },
    {
      key: "investment_withdrawal",
      label: "Withdrawn from holdings",
      amount: r2(f.investmentWithdrawal),
      note: "Investments converted back to cash. This is a transfer, NOT income.",
    },
    {
      key: "emi_principal",
      label: "Loan principal repaid",
      amount: r2(f.emiPrincipal),
      note: "Cash down, debt down by the same amount. Net worth unchanged; not an expense.",
    },
    {
      key: "transfer",
      label: "Wallet transfers (incl. goal contributions)",
      amount: r2(f.transfer),
      note: "Money moved between the user's own accounts. Net worth unchanged.",
    },
  ];

  const explainedChange = r2(components.reduce((s, c) => s + c.effect, 0));

  const beginningIsVerified =
    input.beginningNetWorth !== null && input.beginningNetWorth !== undefined;
  const beginningNetWorth = beginningIsVerified
    ? r2(input.beginningNetWorth as number)
    : r2(input.endingNetWorth - explainedChange);
  const verifiedChange = beginningIsVerified
    ? r2(input.endingNetWorth - beginningNetWorth)
    : null;
  const unexplained = verifiedChange === null ? null : r2(verifiedChange - explainedChange);
  const reconciles = unexplained !== null && Math.abs(unexplained) <= tolerance;

  const notes: string[] = [];
  if (!beginningIsVerified) {
    notes.push(
      "Finora does not store net-worth snapshots, so the beginning net worth shown is DERIVED by working backwards from today's verified net worth and the identified components. The change is therefore explained, not independently verified.",
    );
  }
  if (marketUnavailable) {
    notes.push(
      "Market valuation movement for this period could not be measured, so part of any net-worth change may be unaccounted for.",
    );
  }
  if (unexplained !== null && !reconciles) {
    notes.push(
      `The identified components do not fully explain the change: ${unexplained} rupees remain unexplained by the available records.`,
    );
  }

  return {
    label: input.label,
    from: input.from,
    to: input.to,
    endingNetWorth: r2(input.endingNetWorth),
    beginningNetWorth,
    beginningIsVerified,
    verifiedChange,
    explainedChange,
    components,
    neutralMovements,
    unexplained,
    reconciles,
    marketChangeUnavailable: marketUnavailable,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Portfolio change attribution                                        */
/* ------------------------------------------------------------------ */

export type PortfolioChange = {
  contributed: number;
  withdrawn: number;
  /** Null when valuation history cannot measure market movement. */
  marketChange: number | null;
  /** contributed − withdrawn + market movement, when measurable. */
  totalChange: number | null;
  /** One-line attribution, e.g. "₹5,126: ₹5,000 contributed, ₹126 market gain". */
  explanation: string;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function attributePortfolioChange(input: {
  contributed: number;
  withdrawn: number;
  marketChange: number | null;
}): PortfolioChange {
  const contributed = r2(input.contributed);
  const withdrawn = r2(input.withdrawn);
  const marketChange = input.marketChange === null ? null : r2(input.marketChange);
  const totalChange =
    marketChange === null ? null : r2(contributed - withdrawn + marketChange);

  const parts: string[] = [];
  if (contributed > 0) parts.push(`${inr(contributed)} came from contributions`);
  if (withdrawn > 0) parts.push(`${inr(withdrawn)} was withdrawn`);
  if (marketChange === null) parts.push("market movement is not measurable yet");
  else if (marketChange >= 0) parts.push(`${inr(marketChange)} came from market gains`);
  else parts.push(`${inr(Math.abs(marketChange))} was lost to market movement`);

  const head =
    totalChange === null
      ? "Portfolio change cannot be fully measured"
      : `Your portfolio ${totalChange >= 0 ? "increased" : "decreased"} by ${inr(Math.abs(totalChange))}`;

  return {
    contributed,
    withdrawn,
    marketChange,
    totalChange,
    explanation: `${head}: ${parts.join(", ")}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Market movement over a period (from recorded valuations only)       */
/* ------------------------------------------------------------------ */

export type ValuationRow = { assetId: string; asOf: string; value: number };

export type PeriodMarketChange = {
  /** Sum of (last valuation in period − baseline valuation) across holdings. */
  change: number | null;
  /** Holdings with no usable baseline valuation for this period. */
  withoutBaseline: string[];
  measuredAssets: string[];
};

/**
 * Market movement strictly from RECORDED valuations. The baseline is the last
 * valuation on or before `from`; when a holding has none, it is reported as
 * unmeasurable rather than assumed flat. No price is ever invented.
 */
export function marketChangeOverPeriod(
  valuations: ValuationRow[],
  from: string,
  to: string,
): PeriodMarketChange {
  const byAsset = new Map<string, ValuationRow[]>();
  for (const v of valuations) {
    if (!Number.isFinite(v.value)) continue;
    const list = byAsset.get(v.assetId) ?? [];
    list.push(v);
    byAsset.set(v.assetId, list);
  }

  let total = 0;
  const measuredAssets: string[] = [];
  const withoutBaseline: string[] = [];

  for (const [assetId, rows] of byAsset) {
    const sorted = rows.slice().sort((a, b) => (a.asOf < b.asOf ? -1 : a.asOf > b.asOf ? 1 : 0));
    const baseline = sorted.filter((v) => v.asOf < from).at(-1) ?? null;
    const latest = sorted.filter((v) => v.asOf >= from && v.asOf <= to).at(-1) ?? null;
    if (!baseline || !latest) {
      withoutBaseline.push(assetId);
      continue;
    }
    total += latest.value - baseline.value;
    measuredAssets.push(assetId);
  }

  return {
    change: measuredAssets.length ? r2(total) : null,
    withoutBaseline,
    measuredAssets,
  };
}
