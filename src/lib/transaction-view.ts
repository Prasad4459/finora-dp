// Unified, UI-agnostic view model that can represent EVERY supported
// transaction type. Nothing in the app should infer financial meaning from
// the income/expense mappers alone.
import type { Transaction, TransactionType } from "@/types/database";

export type TransactionDirection = "in" | "out" | "neutral";

export type TransactionView = {
  id: string;
  type: TransactionType;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Human label for the row ("Salary — Infosys", "SBI → HDFC", ...). */
  title: string;
  category: string;
  account: string;
  toAccount: string | null;
  method: string | null;
  notes: string | null;
  /** Absolute amount that moved. */
  amount: number;
  direction: TransactionDirection;
  /** +inflow / -outflow / 0 for transfers (net zero across wallets). */
  signedAmount: number;
  principal: number;
  interest: number;
  recurring: boolean;
  walletId: string | null;
  toWalletId: string | null;
  categoryId: string | null;
  liabilityId: string | null;
  assetId: string | null;
  goalId: string | null;
};

export const TRANSACTION_TYPES: TransactionType[] = [
  "income",
  "expense",
  "transfer",
  "investment",
  "refund",
  "dividend",
  "emi",
];

/** Cash inflow into a wallet. */
export const INFLOW_TYPES: TransactionType[] = ["income", "refund", "dividend"];
/** Cash outflow from a wallet. */
export const OUTFLOW_TYPES: TransactionType[] = ["expense", "investment", "emi"];

export const TRANSACTION_LABEL: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  investment: "Investment",
  refund: "Refund",
  dividend: "Dividend",
  emi: "EMI",
};

export const directionOf = (type: TransactionType): TransactionDirection =>
  INFLOW_TYPES.includes(type) ? "in" : OUTFLOW_TYPES.includes(type) ? "out" : "neutral";

type Lookup = {
  categoryName: (id: string | null) => string;
  walletName: (id: string | null) => string;
};

export function toTransactionView(t: Transaction, lookup: Lookup): TransactionView {
  // The generated types may lag behind the migration; read the extra
  // bookkeeping columns defensively.
  const extra = t as Transaction & {
    principal_amount?: number | null;
    interest_amount?: number | null;
    liability_id?: string | null;
    asset_id?: string | null;
    goal_id?: string | null;
  };
  const amount = Number(t.amount);
  const direction = directionOf(t.type);
  const account = lookup.walletName(t.wallet_id);
  const toAccount = t.to_wallet_id ? lookup.walletName(t.to_wallet_id) : null;
  const interest = Number(extra.interest_amount ?? 0);
  const principal = Number(extra.principal_amount ?? (t.type === "emi" ? amount - interest : 0));

  const title =
    t.type === "transfer"
      ? `${account} → ${toAccount ?? "—"}`
      : t.payee || TRANSACTION_LABEL[t.type];

  return {
    id: t.id,
    type: t.type,
    date: t.transaction_date,
    title,
    category: lookup.categoryName(t.category_id),
    account,
    toAccount,
    method: t.payment_method,
    notes: t.notes,
    amount,
    direction,
    signedAmount: direction === "in" ? amount : direction === "out" ? -amount : 0,
    principal,
    interest,
    recurring: t.is_recurring,
    walletId: t.wallet_id,
    toWalletId: t.to_wallet_id,
    categoryId: t.category_id,
    liabilityId: extra.liability_id ?? null,
    assetId: extra.asset_id ?? null,
    goalId: extra.goal_id ?? null,
  };
}
