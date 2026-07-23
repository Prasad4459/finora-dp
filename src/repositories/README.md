# Repositories

Data-access layer. One file per entity (e.g. `accounts.repo.ts`,
`expenses.repo.ts`). Each module exports async functions that talk to
Supabase via `@/supabase/client` and return plain typed objects.

Rules:
- No React, no hooks, no UI imports here.
- Input/output types come from `@/types/finance` (or generated
  `Database` types).
- Keep queries small and composable; business logic stays in
  `src/services/`.

Not wired yet — tables and auth will be added in a later step.