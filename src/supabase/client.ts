// Central Supabase client re-export.
// The actual client is auto-generated at src/integrations/supabase/client.ts
// and reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from env.
// Import from this module in app code so future swaps stay isolated.
export { supabase } from "@/integrations/supabase/client";
export type { Database } from "@/integrations/supabase/types";