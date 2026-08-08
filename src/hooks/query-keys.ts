import type { QueryKey } from "@tanstack/react-query";
import type { TransactionType } from "@/types/database";

/**
 * Shared cache windows. Financial aggregates are cheap to recompute but change
 * only when a transaction is written (and every write invalidates them
 * explicitly), so a 60s stale window removes the refetch-on-every-mount storm
 * without ever showing stale money.
 */
export const CACHE = {
  /** Recent-activity lists — cheap and visibly "live". */
  short: { staleTime: 30_000, gcTime: 5 * 60_000 },
  /** Summaries, wallets, assets, liabilities, goals, bills, budgets. */
  medium: { staleTime: 60_000, gcTime: 10 * 60_000 },
  /** Reference data that barely changes (categories). */
  long: { staleTime: 10 * 60_000, gcTime: 30 * 60_000 },
} as const;

/** Central TanStack Query keys for every finance domain. */
export const financeKeys = {
  wallets: ["wallets"] as const,
  categories: ["categories"] as const,
  transactions: ["transactions"] as const,
  /** Server-side monthly aggregates (never derived from the loaded page). */
  summary: ["finance-summary"] as const,
  categorySummary: ["finance-category-summary"] as const,
  assets: ["assets"] as const,
  liabilities: ["liabilities"] as const,
  goals: ["goals"] as const,
  budgets: ["budgets"] as const,
  bills: ["bills"] as const,
  notifications: ["notifications"] as const,
  userSettings: ["user-settings"] as const,
  /** Dashboard-only 10-row window. Shares the "transactions" prefix so any
   *  invalidation of the ledger also refreshes it. */
  recentTransactions: (limit: number) => ["transactions", "recent", limit] as const,
};

/**
 * Every cache entry that can be affected by a single financial transaction.
 * A transaction can move a wallet balance, an asset value, a liability
 * outstanding balance, a goal's saved amount and any derived budget/dashboard
 * figure, so all of them are invalidated together.
 */
export const FINANCE_DERIVED_KEYS: readonly QueryKey[] = [
  financeKeys.transactions,
  financeKeys.summary,
  financeKeys.categorySummary,
  financeKeys.wallets,
  financeKeys.assets,
  financeKeys.liabilities,
  financeKeys.goals,
  financeKeys.budgets,
  financeKeys.bills,
];

/**
 * Caches a transaction of a KNOWN type can actually move.
 *
 * Every type touches the ledger, the server aggregates and a wallet balance.
 * Beyond that only the entity the trigger writes to is affected:
 *   investment -> assets, emi -> liabilities, transfer -> goals (goal tag).
 * Budgets hold only limits (spend is derived from the category aggregate) and
 * bills are never written by a transaction, so neither is invalidated.
 */
const TRANSACTION_BASE_KEYS: readonly QueryKey[] = [
  financeKeys.transactions,
  financeKeys.summary,
  financeKeys.categorySummary,
  financeKeys.wallets,
];

export function keysForTransaction(type?: TransactionType | null): readonly QueryKey[] {
  // Unknown type (e.g. deleting a row we no longer hold): stay correct.
  if (!type) return FINANCE_DERIVED_KEYS;
  switch (type) {
    case "investment":
      return [...TRANSACTION_BASE_KEYS, financeKeys.assets];
    case "emi":
      return [...TRANSACTION_BASE_KEYS, financeKeys.liabilities];
    case "transfer":
      // A transfer may carry a goal_id (goal contribution).
      return [...TRANSACTION_BASE_KEYS, financeKeys.goals];
    default:
      return TRANSACTION_BASE_KEYS;
  }
}
