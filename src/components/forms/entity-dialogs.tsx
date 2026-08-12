import { FormDialog, type FieldDef, type SelectOption } from "@/components/forms/form-dialog";
import {
  ACCOUNT_TYPES,
  ASSET_TYPES,
  BILL_CATEGORIES,
  BILL_ICON_KEYS,
  EXPENSE_CATEGORIES,
  GOAL_ICON_KEYS,
  INCOME_CATEGORIES,
  LIABILITY_TYPES,
  PAYMENT_METHODS,
} from "@/constants/finance";
import { todayISO } from "@/lib/date-in";
import { formatINR } from "@/lib/format";
import { FREQUENCY_LABEL, FREQUENCY_OPTIONS, type Frequency } from "@/services/bills";
import { COMPOUNDING_OPTIONS, instrumentMeta, instrumentPriceUnit, type InstrumentField } from "@/services/instruments";
import { allowedSourcesFor } from "@/services/market-refresh";
import { useFinance, type EditTarget } from "@/store/finance-store";
import type { EntityKind } from "@/types/finance";

/** Today in DD/MM/YYYY, Indian calendar. */
const todayDMY = () => {
  const [y, m, d] = todayISO().split("-");
  return `${d}/${m}/${y}`;
};

type Values = Record<string, string | boolean>;

/** Shown whenever a money-moving transaction has no account selected. */
const SELECT_ACCOUNT = "Select an account for this transaction.";

/** Maps an entity being edited back onto the dialog field keys. */
function initialFor(editing: EditTarget | null): Values | null {
  if (!editing) return null;
  const e = editing.entity as Record<string, unknown>;
  const str = (k: string) => (e[k] === undefined || e[k] === null ? "" : String(e[k]));
  switch (editing.kind) {
    case "account":
      return { name: str("name"), bank: str("bank"), type: str("type"), balance: str("balance") };
    case "income":
      return { source: str("source"), category: str("category"), walletId: str("walletId"), amount: str("amount"), date: str("date"), recurring: Boolean(e.recurring) };
    case "expense":
      return { merchant: str("merchant"), category: str("category"), walletId: str("walletId"), method: str("method"), amount: str("amount"), date: str("date") };
    case "asset":
      return {
        name: str("name"),
        type: str("type"),
        purchase: str("purchase"),
        current: str("current"),
        date: str("date"),
        institution: str("institution"),
        folio: str("folio"),
        symbol: str("symbol"),
        exchange: str("exchange"),
        priceSource: str("priceSource") || "manual",
        units: str("units"),
        lastPrice: str("lastPrice"),
        rate: str("rate"),
        compounding: str("compounding"),
        maturityDate: str("maturityDate"),
        maturityValue: str("maturityValue"),
      };
    case "liability":
      return { name: str("name"), type: str("type"), balance: str("balance"), rate: str("rate"), emi: str("emi"), due: str("due") };
    case "goal":
      return { name: str("name"), target: str("target"), current: str("current"), date: str("date") };
    case "budget":
      return { name: str("name"), budget: str("budget"), spent: str("spent") };
    case "contribution":
      return { goal: str("name") };
    case "bill":
      return {
        name: str("name"),
        category: str("category"),
        iconKey: str("iconKey"),
        amount: str("amount"),
        due: str("due"),
        frequency: FREQUENCY_LABEL[(str("frequency") || "monthly") as Frequency] ?? "Monthly",
        walletId: str("walletId"),
        description: str("description"),
        reminderEnabled: e.reminderEnabled !== false,
        reminderDays: str("reminderDays") || "3",
      };
  }
}

export function EntityDialogs({
  open,
  editing = null,
  onClose,
}: {
  open: EntityKind | null;
  editing?: EditTarget | null;
  onClose: () => void;
}) {
  const f = useFinance();
  // WALLET SELECTION IS UUID-BASED.
  // Transactions are never linked to an account by display name; the option
  // value IS the wallet UUID stored on the transaction.
  const walletOptions: SelectOption[] = f.accounts.map((a) => ({
    value: a.id,
    label: `${a.name} · ${a.type}`,
    hint: formatINR(a.balance),
  }));
  const walletField = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef =>
    ({
      key,
      label,
      type: "select",
      options: walletOptions,
      required: true,
      placeholder: "Select account",
      requiredMessage: SELECT_ACCOUNT,
      ...extra,
    }) as FieldDef;
  // Holdings are selected by UUID: financial ownership must never be resolved
  // by display name (two holdings can share a name).
  const assetOptions = f.assets.map((a) => ({ value: a.id, label: a.name, hint: a.type }));
  const liabilityNames = f.liabilities.map((l) => l.name);
  const goalNames = f.goals.map((g) => g.name);
  const today = todayISO();
  const initial = initialFor(editing);
  const editId = editing?.entity.id ?? null;
  const isEdit = (kind: EntityKind) => editing?.kind === kind && !!editId;
  const common = (kind: EntityKind) => ({
    initialValues: editing?.kind === kind ? initial : null,
    submitLabel: isEdit(kind) ? "Save changes" : "Save",
  });

  // The balance is ledger-authoritative: it can only be set once, as the
  // opening balance. Editing an account never overwrites the derived balance.
  const accountFields: FieldDef[] = [
    { key: "name", label: "Account name", type: "text", required: true },
    { key: "bank", label: "Bank / Provider", type: "text", required: true },
    { key: "type", label: "Account type", type: "select", options: ACCOUNT_TYPES as unknown as string[], required: true },
    ...(isEdit("account")
      ? []
      : ([{ key: "balance", label: "Opening balance (₹)", type: "number", required: true }] as FieldDef[])),
  ];

  const incomeFields: FieldDef[] = [
    { key: "source", label: "Source", type: "text", required: true },
    { key: "category", label: "Category", type: "select", options: INCOME_CATEGORIES as unknown as string[], required: true },
    walletField("walletId", "Account"),
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
    { key: "recurring", label: "Recurring", type: "switch" },
  ];

  const expenseFields: FieldDef[] = [
    { key: "merchant", label: "Merchant / Payee", type: "text", required: true },
    { key: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES as unknown as string[], required: true },
    walletField("walletId", "Account"),
    { key: "method", label: "Payment method", type: "select", options: PAYMENT_METHODS as unknown as string[] },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
    // AN EMI IS A LOAN REPAYMENT, NOT A PLAIN EXPENSE.
    // Choosing the EMI category asks for the loan and the interest split so
    // the same ledger row also reduces the outstanding balance.
    {
      key: "liability",
      label: "Loan being repaid",
      type: "select",
      options: liabilityNames,
      required: true,
      placeholder: "Select loan",
      requiredMessage: "Select the loan this EMI repays so its balance goes down.",
      showWhen: (v) => v.category === "EMI",
    },
    {
      key: "interest",
      label: "Interest portion (₹)",
      type: "number",
      hint: "The rest of the instalment repays principal and reduces the loan.",
      showWhen: (v) => v.category === "EMI",
    },
  ];

  // INSTRUMENT-AWARE ASSET FORM
  // The visible fields come from the instrument metadata (services/instruments)
  // — no component ever hard-codes "if FD then show rate".
  const shows = (field: InstrumentField) => (v: Record<string, string | boolean>) =>
    instrumentMeta(String(v.type ?? "")).fields.includes(field);

  const ASSET_FIELD_DEFS: Record<InstrumentField, FieldDef> = {
    institution: { key: "institution", label: "Institution / AMC", type: "text", placeholder: "e.g. HDFC AMC, SBI", showWhen: shows("institution") },
    folio: { key: "folio", label: "Folio / Account number", type: "text", showWhen: shows("folio") },
    symbol: {
      key: "symbol",
      label: "Scheme code / ticker",
      type: "text",
      placeholder: "e.g. 120503 (AMFI scheme code) or RELIANCE",
      hint: "Used to fetch the daily price. AMFI scheme code for mutual funds, ticker for stocks and ETFs.",
      // A ₹/gram gold reference price needs no ticker.
      showWhen: (v) => shows("symbol")(v) && String(v.priceSource ?? "") !== "gold_inr",
    },
    exchange: {
      key: "exchange",
      label: "Exchange",
      type: "select",
      options: [
        { value: "none", label: "Not applicable" },
        { value: "NSE", label: "NSE" },
        { value: "BSE", label: "BSE" },
      ],
      placeholder: "Select exchange",
      showWhen: (v) =>
        shows("exchange")(v) &&
        !["amfi", "gold_inr"].includes(String(v.priceSource ?? "")),
    },
    priceSource: {
      key: "priceSource",
      label: "Price source",
      type: "select",
      options: ["manual", "amfi", "nse", "bse"],
      // Only sources that make sense for THIS instrument are offered:
      // gold_inr for Gold / Digital Gold, NSE/BSE for Gold ETFs, AMFI for
      // Gold Funds. Silver and SGBs stay manual.
      dynamicOptions: (v) => [
        { value: "manual", label: "Manual" },
        ...allowedSourcesFor(String(v.type ?? "")).map((s) => ({
          value: s,
          label: s === "gold_inr" ? "24K gold reference (₹/gram)" : s.toUpperCase(),
        })),
      ],
      default: "manual",
      hint: "Only AMFI / NSE / BSE holdings are refreshed automatically.",
      dynamicHint: (v) =>
        String(v.priceSource ?? "") === "gold_inr"
          ? "24K reference valuation: grams × 24K gold price per gram. Excludes making charges, GST and dealer spreads."
          : "Only AMFI / NSE / BSE holdings are refreshed automatically.",
      showWhen: shows("priceSource"),
    },
    purchase: { key: "purchase", label: "Invested amount (₹)", type: "number", required: true, showWhen: shows("purchase") },
    units: {
      key: "units",
      // Physical/digital metal is held in grams; funds and ETFs in units.
      label: "Units held",
      dynamicLabel: (v) =>
        instrumentPriceUnit(String(v.type ?? "")) === "per_gram" ? "Grams held" : "Units held",
      type: "number",
      showWhen: shows("units"),
    },
    avgCost: { key: "avgCost", label: "Average cost per unit (₹)", type: "number", showWhen: shows("avgCost") },
    lastPrice: {
      key: "lastPrice",
      label: "Current NAV / price PER UNIT (₹)",
      dynamicLabel: (v) =>
        instrumentPriceUnit(String(v.type ?? "")) === "per_gram"
          ? "Current price PER GRAM (₹)"
          : "Current NAV / price PER UNIT (₹)",
      type: "number",
      placeholder: "Leave empty to use your average cost",
      hint: "Per unit, not the total value. Current value = units × this price.",
      dynamicHint: (v) =>
        instrumentPriceUnit(String(v.type ?? "")) === "per_gram"
          ? "Per gram, not the total value. Current value = grams × this price (24K reference)."
          : "Per unit, not the total value. Current value = units × this price.",
      showWhen: shows("lastPrice"),
    },
    current: { key: "current", label: "Current value (₹)", type: "number", required: true, showWhen: shows("current") },
    rate: { key: "rate", label: "Interest rate (% p.a.)", type: "number", showWhen: shows("rate") },
    compounding: { key: "compounding", label: "Compounding", type: "select", options: COMPOUNDING_OPTIONS as unknown as string[], default: "Yearly", showWhen: shows("compounding") },
    date: { key: "date", label: "Start / purchase date", type: "date", default: today, showWhen: shows("date") },
    maturityDate: { key: "maturityDate", label: "Maturity date", type: "date", showWhen: shows("maturityDate") },
    maturityValue: { key: "maturityValue", label: "Maturity value (₹)", type: "number", showWhen: shows("maturityValue") },
  };

  const ASSET_FIELD_ORDER: InstrumentField[] = [
    "institution",
    "folio",
    "symbol",
    "priceSource",
    "exchange",
    "purchase",
    "units",
    "avgCost",
    "lastPrice",
    "rate",
    "compounding",
    "date",
    "maturityDate",
    "maturityValue",
    "current",
  ];

  const assetFields: FieldDef[] = [
    { key: "name", label: "Investment / asset name", type: "text", required: true },
    { key: "type", label: "Type", type: "select", options: ASSET_TYPES as unknown as string[], required: true },
    ...ASSET_FIELD_ORDER.map((k) => ASSET_FIELD_DEFS[k]),
    // Funding the purchase from an account records it in the ledger, so the
    // wallet is debited by the database trigger instead of drifting.
    ...(isEdit("asset")
      ? []
      : [
          walletField("fundingWalletId", "Funded from account (optional)", {
            required: false,
            placeholder: "Not funded from an account",
            hint: "Debits this account and records an investment transaction. Leave empty for employer-funded or already-held investments.",
          }),
        ]),
  ];

  const liabilityFields: FieldDef[] = [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "type", label: "Type", type: "select", options: LIABILITY_TYPES as unknown as string[], required: true },
    { key: "balance", label: "Outstanding balance (₹)", type: "number", required: true },
    { key: "rate", label: "Interest rate (%)", type: "number" },
    { key: "emi", label: "EMI (₹)", type: "number" },
    { key: "due", label: "Next due date", type: "date", default: today },
  ];

  const goalFields: FieldDef[] = [
    { key: "name", label: "Goal name", type: "text", required: true },
    { key: "iconKey", label: "Icon", type: "select", options: GOAL_ICON_KEYS as unknown as string[], default: "PiggyBank" },
    { key: "target", label: "Target amount (₹)", type: "number", required: true },
    { key: "current", label: "Saved so far (₹)", type: "number", default: "0" },
    { key: "date", label: "Target date", type: "date", default: today },
  ];

  const budgetFields: FieldDef[] = [
    { key: "name", label: "Category", type: "text", required: true, placeholder: "e.g. Dining out" },
    { key: "budget", label: "Monthly budget (₹)", type: "number", required: true },
    { key: "spent", label: "Spent so far (₹)", type: "number", default: "0" },
  ];

  const billFields: FieldDef[] = [
    { key: "name", label: "Bill name", type: "text", required: true },
    { key: "category", label: "Category", type: "select", options: BILL_CATEGORIES as unknown as string[], required: true },
    { key: "iconKey", label: "Icon", type: "select", options: BILL_ICON_KEYS as unknown as string[], default: "Receipt" },
    { key: "amount", label: "Expected amount (₹)", type: "number", required: true },
    { key: "due", label: "Next due date (DD/MM/YYYY)", type: "text", default: todayDMY(), required: true },
    { key: "frequency", label: "Recurrence", type: "select", options: FREQUENCY_OPTIONS, default: "Monthly", required: true },
    walletField("walletId", "Pay from account", { required: false }),
    { key: "reminderEnabled", label: "Reminders", type: "switch", default: "true" },
    { key: "reminderDays", label: "Remind me (days before)", type: "number", default: "3" },
    { key: "description", label: "Notes", type: "textarea", placeholder: "Optional" },
  ];

  const transferFields: FieldDef[] = [
    walletField("from", "From account"),
    walletField("to", "To account"),
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional" },
  ];

  const investmentFields: FieldDef[] = [
    { key: "assetId", label: "Invest into (holding)", type: "select", options: assetOptions, required: true, placeholder: "Select holding", requiredMessage: "Select a holding" },
    { key: "employerFunded", label: "Employer funded", type: "switch", hint: "EPF / NPS employer share — no money leaves your accounts" },
    walletField("walletId", "Paid from account", { showWhen: (v) => !v.employerFunded }),
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "units", label: "Units bought (optional)", type: "number" },
    { key: "pricePerUnit", label: "Price / NAV per unit (₹)", type: "number" },
    { key: "date", label: "Date", type: "date", default: today },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional" },
  ];

  const redemptionFields: FieldDef[] = [
    { key: "assetId", label: "Sell / withdraw from", type: "select", options: assetOptions, required: true, placeholder: "Select holding", requiredMessage: "Select a holding" },
    walletField("walletId", "Credited to account"),
    { key: "units", label: "Units sold (optional)", type: "number" },
    { key: "amount", label: "Proceeds received (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional" },
  ];

  const sipFields: FieldDef[] = [
    { key: "assetId", label: "Contribute to", type: "select", options: assetOptions, required: true, placeholder: "Select holding", requiredMessage: "Select a holding" },
    walletField("walletId", "Debit from account"),
    { key: "amount", label: "Instalment amount (₹)", type: "number", required: true },
    { key: "frequency", label: "Frequency", type: "select", options: FREQUENCY_OPTIONS, default: "Monthly", required: true },
    { key: "nextDue", label: "Next due date", type: "date", default: today, required: true },
    { key: "autoDebit", label: "Auto debit", type: "switch", hint: "The bank debits this automatically" },
  ];

  const dividendFields: FieldDef[] = [
    { key: "source", label: "Source", type: "text", required: true, placeholder: "e.g. TCS Dividend" },
    walletField("walletId", "Credited to account"),
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  const refundFields: FieldDef[] = [
    { key: "merchant", label: "Refunded by", type: "text", required: true },
    { key: "category", label: "Original expense category", type: "select", options: EXPENSE_CATEGORIES as unknown as string[], required: true, placeholder: "Select category" },
    walletField("walletId", "Credited to account"),
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  const emiFields: FieldDef[] = [
    { key: "liability", label: "Loan / liability", type: "select", options: liabilityNames, required: true },
    walletField("walletId", "Paid from account"),
    { key: "amount", label: "EMI amount (₹)", type: "number", required: true },
    { key: "principal", label: "Principal portion (₹)", type: "number" },
    { key: "interest", label: "Interest portion (₹)", type: "number" },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  const contributionFields: FieldDef[] = [
    { key: "goal", label: "Goal", type: "select", options: goalNames, required: true },
    walletField("walletId", "Paid from account"),
    walletField("to", "Held in account"),
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", default: today },
  ];

  return (
    <>
      <FormDialog open={open === "account"} onClose={onClose} title={isEdit("account") ? "Edit account" : "Add account"} fields={accountFields} {...common("account")}
        onSubmit={(v) => {
          const payload = { name: v.name, bank: v.bank, type: v.type, balance: Number(v.balance || 0) };
          isEdit("account") ? f.updateAccount(editId!, payload) : f.addAccount(payload);
        }}
      />
      <FormDialog open={open === "income"} onClose={onClose} title={isEdit("income") ? "Edit income" : "Add income"} fields={incomeFields} {...common("income")}
        onSubmit={(v) => {
          const payload = { source: v.source, category: v.category, account: "", walletId: v.walletId, amount: Number(v.amount), date: v.date || today, recurring: !!v.recurring };
          isEdit("income") ? f.updateIncome(editId!, payload) : f.addIncome(payload);
        }}
      />
      <FormDialog open={open === "expense"} onClose={onClose} title={isEdit("expense") ? "Edit expense" : "Add expense"} fields={expenseFields} {...common("expense")}
        onSubmit={(v) => {
          if (!isEdit("expense") && v.category === "EMI" && v.liability) {
            const amount = Number(v.amount);
            const interest = Number(v.interest || 0);
            f.addEmiPayment({
              liability: String(v.liability),
              walletId: String(v.walletId),
              amount,
              principal: Math.max(0, amount - interest),
              interest,
              date: (v.date as string) || today,
            });
            return;
          }
          const payload = { merchant: v.merchant, category: v.category, account: "", walletId: v.walletId, method: v.method || "UPI", amount: Number(v.amount), date: v.date || today };
          isEdit("expense") ? f.updateExpense(editId!, payload) : f.addExpense(payload);
        }}
      />
      <FormDialog open={open === "asset"} onClose={onClose} title={isEdit("asset") ? "Edit asset" : "Add asset"} fields={assetFields} {...common("asset")}
        onSubmit={(v) => {
          const num = (x: unknown) => (x === "" || x === undefined || x === null ? null : Number(x));
          const payload = {
            name: v.name,
            type: v.type,
            purchase: Number(v.purchase || 0),
            current: Number(v.current || v.purchase || 0),
            date: v.date || today,
            institution: v.institution || null,
            folio: v.folio || null,
            symbol: v.symbol || null,
            exchange: !v.exchange || v.exchange === "none" ? null : v.exchange,
            priceSource: v.priceSource || "manual",
            units: num(v.units),
            avgCost: num(v.avgCost),
            lastPrice: num(v.lastPrice),
            rate: num(v.rate),
            compounding: v.compounding || null,
            maturityDate: v.maturityDate || null,
            maturityValue: num(v.maturityValue),
            fundingWalletId: v.fundingWalletId || undefined,
          };
          isEdit("asset") ? f.updateAsset(editId!, payload) : f.addAsset(payload);
        }}
      />
      <FormDialog open={open === "liability"} onClose={onClose} title={isEdit("liability") ? "Edit liability" : "Add liability"} fields={liabilityFields} {...common("liability")}
        onSubmit={(v) => {
          const payload = { name: v.name, type: v.type, balance: Number(v.balance), rate: Number(v.rate || 0), emi: Number(v.emi || 0), due: v.due || today };
          isEdit("liability") ? f.updateLiability(editId!, payload) : f.addLiability(payload);
        }}
      />
      <FormDialog open={open === "goal"} onClose={onClose} title={isEdit("goal") ? "Edit goal" : "Create goal"} fields={goalFields} {...common("goal")}
        onSubmit={(v) => {
          const payload = { name: v.name, iconKey: v.iconKey || "PiggyBank", target: Number(v.target), current: Number(v.current || 0), date: v.date || today };
          isEdit("goal") ? f.updateGoal(editId!, payload) : f.addGoal(payload);
        }}
      />
      <FormDialog open={open === "budget"} onClose={onClose} title={isEdit("budget") ? "Edit budget" : "Set budget"} fields={budgetFields} {...common("budget")}
        onSubmit={(v) => {
          const payload = { name: v.name, budget: Number(v.budget), spent: Number(v.spent || 0) };
          isEdit("budget") ? f.updateBudget(editId!, payload) : f.addBudget(payload);
        }}
      />
      <FormDialog open={open === "bill"} onClose={onClose} title={isEdit("bill") ? "Edit bill" : "Add bill"} fields={billFields} {...common("bill")}
        onSubmit={(v) => {
          const payload = {
            name: v.name,
            category: v.category,
            iconKey: v.iconKey || "Receipt",
            amount: Number(v.amount),
            due: v.due || todayDMY(),
            frequency: v.frequency,
            walletId: v.walletId || undefined,
            description: v.description,
            reminderEnabled: !!v.reminderEnabled,
            reminderDays: v.reminderDays,
          };
          isEdit("bill") ? f.updateBill(editId!, payload) : f.addBill(payload);
        }}
      />
      <FormDialog open={open === "transfer"} onClose={onClose} title="Transfer between accounts" fields={transferFields}
        onSubmit={(v) => f.addTransfer({ fromWalletId: v.from, toWalletId: v.to, amount: Number(v.amount), date: v.date || today, notes: v.notes })}
      />
      <FormDialog open={open === "investment"} onClose={onClose} title="Record investment" fields={investmentFields}
        onSubmit={(v) =>
          f.addInvestment({
            assetId: v.assetId,
            walletId: v.walletId,
            amount: Number(v.amount),
            date: v.date || today,
            notes: v.notes,
            units: v.units ? Number(v.units) : undefined,
            pricePerUnit: v.pricePerUnit ? Number(v.pricePerUnit) : undefined,
            employerFunded: !!v.employerFunded,
          })
        }
      />
      <FormDialog open={open === "redemption"} onClose={onClose} title="Redeem / sell investment" fields={redemptionFields}
        onSubmit={(v) =>
          f.addRedemption({
            assetId: v.assetId,
            walletId: v.walletId,
            amount: Number(v.amount),
            units: v.units ? Number(v.units) : undefined,
            date: v.date || today,
            notes: v.notes,
          })
        }
      />
      <FormDialog open={open === "sip"} onClose={onClose} title="Schedule a contribution" fields={sipFields}
        onSubmit={(v) =>
          f.addSip({
            assetId: v.assetId,
            walletId: v.walletId,
            amount: Number(v.amount),
            frequency: v.frequency || "Monthly",
            nextDue: v.nextDue || today,
            autoDebit: !!v.autoDebit,
          })
        }
      />
      <FormDialog open={open === "dividend"} onClose={onClose} title="Record dividend" fields={dividendFields}
        onSubmit={(v) => f.addDividend({ source: v.source, walletId: v.walletId, amount: Number(v.amount), date: v.date || today })}
      />
      <FormDialog open={open === "refund"} onClose={onClose} title="Record refund" fields={refundFields}
        onSubmit={(v) => f.addRefund({ merchant: v.merchant, category: v.category, walletId: v.walletId, amount: Number(v.amount), date: v.date || today })}
      />
      <FormDialog open={open === "emi"} onClose={onClose} title="Record EMI payment" fields={emiFields}
        onSubmit={(v) => f.addEmiPayment({ liability: v.liability, walletId: v.walletId, amount: Number(v.amount), principal: Number(v.principal || 0), interest: Number(v.interest || 0), date: v.date || today })}
      />
      <FormDialog open={open === "contribution"} onClose={onClose} title="Add to goal" fields={contributionFields}
        initialValues={editing?.kind === "contribution" ? initial : null}
        onSubmit={(v) => f.addGoalContribution({ goal: v.goal, fromWalletId: v.walletId, toWalletId: v.to, amount: Number(v.amount), date: v.date || today })}
      />
    </>
  );
}