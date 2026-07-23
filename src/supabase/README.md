# Supabase

Backend is provisioned via Lovable Cloud (Supabase under the hood).

- Auth, Postgres, and Storage are enabled at the project level.
- Client: `import { supabase } from "@/supabase/client"`.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (already wired in `.env`).

No tables, auth flows, or migrations are wired to the UI yet — the app still
runs entirely off the local React store in `src/store/finance-store.tsx`.

## Structure

- `src/supabase/` — client + shared backend types.
- `src/repositories/` — thin data-access layer (one file per entity). Wraps
  Supabase queries; called by services/hooks. No React here.
- `src/services/` — pure business logic and builders (already in use by the
  local store). Backend-aware services will live alongside.
- `src/hooks/` — React Query / state hooks that call repositories + services.