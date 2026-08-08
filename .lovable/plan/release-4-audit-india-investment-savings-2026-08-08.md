# Release 4 Audit: India Investment & Savings

Read-only audit of Assets, Investment Account wallets, Transactions and Net Worth. No files or data changed.

### Existing investment capabilities
- Asset types already usable as investments: mutual_fund, stocks, fixed_deposit, ppf, epf, nps, crypto, gold, silver, plus other as a catch-all. Non-investment types: property, vehicle, bank, cash.
- Asset fields that exist today: name, type, purchase_value, current_value, quantity, purchase_date, institution, notes.
- Investment transactions work: a transaction of type `investment` with an `asset_id` moves cash out of the wallet and adds the same amount to both current_value and purchase_value of the asset (trigger `tx_apply`), with automatic reversal on edit/delete.
- Dividends are handled as income into a wallet (`dividend` type) and correctly excluded from asset cost.
- Net worth already avoids the main double-count: wallets of type "Investment Account" and "Loan Account" are excluded from net worth, and asset rows of type Cash/Bank are excluded, so investments are counted once, from the assets table.

### Reusable existing architecture
- The assets table + assetsRepo + useAssets + toAsset mapper + generic createRepository CRUD is a solid base; no rewrite needed.
- The ledger trigger already provides atomic, reversible cash-to-asset accounting — Release 4 should extend it, never bypass it.
- computeTotals / INVESTMENT_ASSET_TYPES / WALLET_MIRRORED_ASSET_TYPES in src/services/finance.ts give a single place to classify new instrument types.
- The Bills release already established the pattern SIPs need: a schedule row plus a "mark paid" mutation that writes a real ledger transaction and rolls the next due date forward.

### Missing capabilities
- No instrument types for ETF, bonds, REIT, InvIT, recurring deposit, Sukanya Samriddhi, NSC, KVP, SCSS, post-office schemes.
- No units/NAV model: quantity exists but there is no unit price, no average cost, and quantity is never updated by an investment transaction.
- No maturity date, interest rate, compounding frequency, or payout mode for FD/RD/PPF/NSC/KVP/SCSS/SSY/bonds.
- No contribution schedule (SIP/RD/PPF/NPS/SSY), no missed-contribution detection, no contribution history per holding.
- No redemption/sale flow: no way to sell units, realise gains, or move value back to a wallet. Deleting an asset silently destroys net worth.
- No value-history table, so no XIRR/CAGR, no portfolio growth chart, no "value as of date".
- No folio/demat grouping: a folio holding many scrips can only be modelled as one asset row per scrip.

### Required schema changes
1. Extend asset_type with: etf, bond, reit, invit, recurring_deposit, sukanya_samriddhi, nsc, kvp, scss, post_office.
2. Add to assets: units, avg_cost, last_price, last_price_at, interest_rate, compounding, maturity_date, maturity_value, folio_number, linked_wallet_id, is_active.
3. New investment_contributions (schedule): asset_id, amount, frequency, next_due_date, day_of_month, wallet_id, auto_debit, status — the SIP/RD/PPF engine.
4. New asset_valuations (history): asset_id, as_of, value, units, source (manual | market) — for growth charts and XIRR.
5. Redemption support: a redemption path that credits the wallet and reduces current_value/units.
6. Trigger extension: when an investment transaction carries units and price, update units and avg_cost rather than only rupee values.

### Required domain models
- Instrument metadata map per asset type: needs units, price, rate, maturity, schedule, lock-in; which form fields to show; how current value is derived.
- Value derivation strategies: market (units x last_price), accrual (principal compounded at rate to maturity), manual.
- Holding view model = asset row + derived current value + invested + unrealised P&L + XIRR + next contribution.
- Portfolio aggregate: by class (equity, debt, small savings, gold, alternatives), allocation %, maturity ladder.

### Recommended investment architecture
Extend the existing Assets domain rather than creating a parallel Investments domain. A single net-worth source of truth is why the current engine is correct; a second table would reintroduce double counting. Add an "investment facet" on assets: extra columns, two child tables (contributions, valuations), an instrument-metadata layer in code, and an Investments page that is a richer filtered view of assets. Physical assets keep the simple form.

### Financial/accounting risks
- Users may not realise an "Investment Account" wallet balance is excluded from net worth by design — needs UI labelling, not a rule change.
- Accrued-but-unreceived interest (PPF, NSC, KVP, cumulative FD) must raise current_value only, never income, or savings rate inflates.
- Interest actually credited to a bank account (FD payout, SCSS quarterly) must be income and must not also raise asset value.
- Auto-accrual would change net worth with no transaction behind it; keep it derived/preview-only or write an explicit revaluation record.
- Without a redemption flow, users delete assets, destroying history and distorting the net-worth curve.
- The current trigger raises purchase_value by the full amount, so appreciation is wiped by the next SIP instalment unless units/avg-cost logic replaces it.
- Asset deletion with linked transactions (transactions.asset_id FK) needs an explicit, understandable path.
- EPF/NPS employer contributions are not salary cash flow; recording them as an investment from a wallet creates a phantom outflow.

### Recommended implementation order
1. Schema: new asset types, new columns, investment_contributions, asset_valuations.
2. Instrument metadata layer and a dynamic asset form showing only relevant fields.
3. Units/avg-cost aware investment transactions plus a redemption flow.
4. Accrual value engine for FD/RD/PPF/NSC/KVP/SCSS/SSY with maturity dates.
5. SIP/contribution schedules reusing the Bills reminder + mark-paid pattern.
6. Investments page: holdings, allocation, P&L, maturity ladder.
7. Valuation history and growth chart; manual price refresh now, live market feed later.

### Release 4 scope recommendation
Ship steps 1-5 as Release 4 (data model, instrument-aware forms, correct buy/sell accounting, accrual engine, SIP schedules) plus a first Investments page with holdings and allocation. Defer XIRR, maturity ladder, valuation-history charts and live market prices to Release 5 — adding asset_valuations now makes that additive.