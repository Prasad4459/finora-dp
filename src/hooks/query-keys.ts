import type { QueryKey } from "@tanstack/react-query";

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
