# Structural review: issues found and how to fix them

The app works, but a few structural choices will cause bugs and slow future work. Ordered by risk.

## 1. Hooks created inside a helper function (real bug risk)
`src/store/finance-store.tsx` defines a local `run()` helper that calls `useMutation` inside it, with an eslint disable for rules-of-hooks. It only works because the calls happen in a fixed order today. Any conditional or loop added later silently corrupts React state.

Fix: make `run` a proper custom hook declared at module scope, or declare each mutation explicitly.

## 2. One giant store holding all nine domains
`finance-store.tsx` is a 319-line context loading wallets, categories, transactions, assets, liabilities, goals, budgets, bills and notifications at once, exposing ~25 functions. Every page re-renders on any change and waits on a single `loading` flag even when it needs one dataset.

Fix: split into per-domain hooks in `src/hooks/` (`use-wallets`, `use-transactions`, `use-assets`, ...), each owning its query + mutations. Keep a thin `FinanceProvider` only for shared dialog state.

## 3. The repository layer discards generated types
`src/repositories/base.repo.ts` casts the Supabase client to a hand-written `UntypedQuery` shape, removing compile-time checking of column names and payloads for every repository built on it. Typos surface only at runtime.

Fix: keep the generic factory but type it against the generated `Database` tables instead of the `unknown`-based shim.

## 4. Two different Supabase client import paths
`src/supabase/client.ts` re-exports the generated client, and imports are inconsistent: repositories use `@/supabase/client`, the store and sidebar use `@/integrations/supabase/client`. `src/types/database.ts` adds a third alias layer over the generated types.

Fix: standardise on one path and drop the redundant wrapper.

## 5. Business logic lives in UI, service layer is empty
`src/services/finance.ts` is 6 lines. Budget "spent" calculation, category auto-creation and wallet name-to-id resolution live in the store; the financial health score and all aggregations live in `src/pages/dashboard.tsx` (562 lines).

Fix: move pure calculations into `src/services/` (testable, no React) and split the dashboard into widget components under `src/components/dashboard/`.

## 6. Budgets are matched by category name string
Budget spend compares a transaction's category *name* to the budget name. Renaming a category or a casing difference silently zeroes the spend.

Fix: match on `category_id`, falling back to name only for legacy rows.

## 7. No edit path anywhere
Repositories expose `update`, but the store only wires create and delete. Users cannot correct a wrong amount — they must delete and re-add.

Fix: add update mutations and an edit mode to the existing dialogs.

## 8. Data loading bypasses the router
Every route is a thin wrapper with no `loader`, so all fetches start after mount and pages flash a loading state on each navigation.

Fix: expose `queryOptions` per domain and prefetch via `ensureQueryData` in route loaders (safe here, since `_authenticated` already gates the subtree).

## 9. Stale scaffolding docs
`src/repositories/README.md` and `src/hooks/README.md` still say the backend is "not wired yet" and describe files that were never created.

Fix: rewrite both to match the actual structure.

## Suggested order
Items 1, 6, 7 are correctness. 2, 3, 5, 8 are structure. 4, 9 are cleanup. Recommended sequence: 1 → 6 → 3 → 2 → 5 → 8 → 7 → 4 → 9, each as a separate change so the UI can be verified in between.

No visual or behavioural change is intended by any of these except item 7, which adds editing.