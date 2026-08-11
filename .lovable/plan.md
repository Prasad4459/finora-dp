# Release 5.1 — Ask Finora

A read-only financial copilot page. The AI never touches the database and never computes financial numbers: it only explains figures produced by the existing finance and What-If engines.

## How it works

```text
User question (Ask Finora page)
  -> authenticated server function (verifies the signed-in user)
  -> user-scoped snapshot built with the existing finance services
  -> intent detection -> existing What-If scenario engine (when hypothetical)
  -> structured FACT / PROJECTION / ASSUMPTION context
  -> Lovable AI (server-side key)
  -> streamed answer back to the page
```

## Scope

New files only, plus one sidebar entry and one route. No changes to the ledger, wallets, investments, liabilities, bills, goals, budgets, or the finance/scenario calculations.

## 1. Server-side snapshot (trusted)

`src/lib/ask-finora.server.ts`
- Builds the financial snapshot on the server using `context.supabase` from `requireSupabaseAuth`, so every read runs under RLS as the signed-in user. Numbers are never taken from the client.
- Reuses the existing pure services (`src/services/finance.ts`, `src/services/dashboard.ts`, `src/services/bills.ts`, `src/services/portfolio.ts`) — no second calculation system.
- Fields sent: monthly income, expenses, savings + savings rate, net worth, wallet/account total, investment total, asset total, total debt, monthly EMI, per-liability (name, balance, rate, EMI, remaining months), goals (name, target, current, target date), active budgets (name, budget, spent), recurring contributions (name, amount, frequency), upcoming bills (name, amount, due date), health-score pillars, and the last 6 months of aggregate income/expense/savings for trend and "why did my net worth change" explanations.
- No raw transaction rows, no merchant names, no account numbers, no email or profile identity.

## 2. Scenario integration

- Lightweight intent + number extraction (regex over ₹/lakh/crore amounts and keywords) picks one of: overview, improve, goal, new EMI, invest vs prepay, increase investment, net-worth explanation.
- For hypothetical intents, the server calls the existing `runNewEmiScenario`, `runInvestMoreScenario`, `runInvestVsPrepayScenario`, `projectGoalDate` / `compareGoals` from `src/services/scenario-engine.ts` — unchanged — and passes the computed comparison into the prompt.
- The prompt forbids inventing projections; if a scenario needs an input the question doesn't supply, the answer asks for it or states the assumption used.
- Insufficient data (no income/expense history, no matching liability) returns "I don't have enough information to calculate that yet." without calling the AI.

## 3. AI endpoint

`src/lib/ask-finora.functions.ts` — a `createServerFn` with `.middleware([requireSupabaseAuth])`, stateless (no conversation storage), taking `{ question }` and returning the answer text plus the structured facts/projections used.
- Model call through the Lovable AI gateway with the server-side key; the key never reaches the browser.
- System prompt enforces: Indian rupee formatting, concise personalized answers, explicit FACT / PROJECTION / ASSUMPTION / RECOMMENDATION labelling, no guarantees, and "do this in Investments/Goals/Bills" instead of offering to act.
- Errors (AI unavailable, rate limit, credits, timeout) are surfaced as clear messages, never a fabricated answer.

## 4. UI

`src/pages/ask-finora.tsx` + `src/routes/_authenticated/ask-finora.tsx` (own head metadata), and an "Ask Finora" sidebar entry (MessageCircle icon) added to the existing nav list.
- Heading "Ask Finora", subtitle "Your personal financial copilot.", welcome line "What would you like to know?".
- Five suggested-question chips exactly as specified, plus a free-text input.
- Q&A thread held in component state for the session only; loading, empty and error states; mobile-friendly single column; existing Finora card/typography style, no dashboard changes.
- Small muted disclaimer under the input: educational insights and projections, estimates not guarantees, not regulated financial advice.

## 5. Verification

- Two authenticated users: confirm each answer only reflects that user's data and that a question changes no wallet balance, transaction, or any other row (before/after DB check).
- Confirm the server function contains no insert/update/delete and no service-role client.
- Confirm projection numbers in answers match the scenario engine output directly.
- Typecheck, production build, browser check for console errors, mobile viewport check.

## Technical notes

- New files: `src/lib/ask-finora.server.ts`, `src/lib/ask-finora.functions.ts`, `src/pages/ask-finora.tsx`, `src/routes/_authenticated/ask-finora.tsx`. One edited file: `src/components/layout/app-sidebar.tsx`.
- No migrations, no new tables, no new secrets (the Lovable AI key is already managed server-side).
