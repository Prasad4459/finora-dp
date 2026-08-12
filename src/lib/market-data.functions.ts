// Market-data RPC boundary. Thin wrapper only — the provider logic (and the
// API key) live in the server-only module, so nothing ships to the browser.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchQuotes } from "./market-data.server";
import type { PriceRequest, Quote, QuoteFailure } from "@/services/market-refresh";

export type MarketQuotesResult = { quotes: Quote[]; failures: QuoteFailure[] };

/** Max instruments per refresh — keeps a run bounded and provider-friendly. */
const MAX_ITEMS = 50;

export const fetchMarketQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { items: PriceRequest[] }) => {
    const items = Array.isArray(input?.items) ? input.items : [];
    const clean = items
      .filter((i) => i && typeof i.id === "string" && typeof i.symbol === "string")
      .slice(0, MAX_ITEMS)
      .map((i) => ({
        id: i.id,
        name: String(i.name ?? ""),
        symbol: String(i.symbol).trim().slice(0, 32),
        exchange: i.exchange ? String(i.exchange).trim().slice(0, 16) : null,
        source: (["amfi", "nse", "bse"].includes(String(i.source)) ? i.source : "nse") as PriceRequest["source"],
      }));
    return { items: clean };
  })
  .handler(async ({ data }): Promise<MarketQuotesResult> => fetchQuotes(data.items));
