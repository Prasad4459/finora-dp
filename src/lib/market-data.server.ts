// SERVER-ONLY market-data adapters (Release 7C).
//
// Provider access lives here so no API key can ever reach the browser bundle.
// Two adapters today, both EOD/daily:
//   • AMFI  — free public NAVAll.txt feed, keyed by AMFI scheme code.
//   • Twelve Data — NSE/BSE stocks & ETFs, keyed by symbol + exchange.
// Swapping a provider means editing only this file.
import type { PriceRequest, Quote, QuoteFailure } from "@/services/market-refresh";
import { isValidPrice } from "@/services/instruments";

// AMFI serves the same NAVAll feed from two hosts. www.amfiindia.com is often
// unreachable from datacentre egress (connection hangs), so the portal host is
// tried first and www is only a fallback.
const AMFI_NAV_URLS = [
  "https://portal.amfiindia.com/spages/NAVAll.txt",
  "https://www.amfiindia.com/spages/NAVAll.txt",
];
const TWELVE_DATA_URL = "https://api.twelvedata.com/quote";
/** Gold is quoted per troy ounce; Indian holdings are held in grams. */
export const GRAMS_PER_TROY_OUNCE = 31.1034768;
/** Nobody waits indefinitely for a failed instrument. */
const TIMEOUT_MS = 8_000;
/** The AMFI feed is a ~1.6 MB text file — it needs a longer budget. */
const AMFI_TIMEOUT_MS = 20_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const timeout = () => AbortSignal.timeout(TIMEOUT_MS);

/** "11-Aug-2026" -> "2026-08-11". Returns null for anything unexpected. */
export function parseAmfiDate(raw: string): string | null {
  const [d, mon, y] = raw.trim().split("-");
  const m = MONTHS.indexOf(mon);
  if (!d || m < 0 || !y || y.length !== 4) return null;
  return `${y}-${String(m + 1).padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export type AmfiNav = { price: number; asOf: string };

/** Parses the AMFI NAVAll feed into a scheme-code -> NAV map. */
export function parseAmfiFeed(text: string): Map<string, AmfiNav> {
  const out = new Map<string, AmfiNav>();
  for (const line of text.split("\n")) {
    if (!line.includes(";")) continue;
    const parts = line.split(";");
    if (parts.length < 6) continue;
    const code = parts[0].trim();
    if (!/^\d+$/.test(code)) continue;
    const price = Number(parts[4].trim());
    const asOf = parseAmfiDate(parts[5] ?? "");
    if (!isValidPrice(price) || !asOf) continue;
    out.set(code, { price, asOf });
  }
  return out;
}

async function loadAmfiFeed(): Promise<Map<string, AmfiNav>> {
  const errors: string[] = [];
  for (const url of AMFI_NAV_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(AMFI_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`returned ${res.status}`);
      const feed = parseAmfiFeed(await res.text());
      if (feed.size === 0) throw new Error("feed contained no usable NAV rows");
      return feed;
    } catch (err) {
      const host = new URL(url).host;
      errors.push(`${host}: ${err instanceof Error ? err.message : "unreachable"}`);
    }
  }
  throw new Error(`AMFI feed unavailable (${errors.join("; ")})`);
}

async function fetchTwelveData(
  req: PriceRequest,
  apiKey: string,
): Promise<{ price: number; asOf: string }> {
  const url = new URL(TWELVE_DATA_URL);
  url.searchParams.set("symbol", req.symbol);
  if (req.exchange) url.searchParams.set("exchange", req.exchange);
  url.searchParams.set("country", "India");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url, { signal: timeout() });
  if (!res.ok) throw new Error(`provider returned ${res.status}`);
  const body = (await res.json()) as {
    close?: string | number;
    previous_close?: string | number;
    datetime?: string;
    status?: string;
    message?: string;
  };
  if (body.status === "error") throw new Error(body.message ?? "provider error");
  const price = Number(body.close ?? body.previous_close);
  if (!isValidPrice(price)) throw new Error("no usable close price");
  const asOf = String(body.datetime ?? "").slice(0, 10);
  return { price, asOf: /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : todayIST() };
}

/** Today's IST calendar date, duplicated here to keep this module dependency-free. */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type QuoteBatch = { quotes: Quote[]; failures: QuoteFailure[] };

/**
 * 24K REFERENCE GOLD PRICE IN ₹ PER GRAM.
 * Twelve Data has no XAU/INR pair, so the spot metal (XAU/USD, "Gold Spot")
 * is converted with the USD/INR rate from the same provider. This is a pure
 * bullion reference: no making charges, GST, dealer spread or resale haircut,
 * and no 22K/18K purity modelling.
 */
export async function fetchGoldInrPerGram(
  apiKey: string,
): Promise<{ price: number; asOf: string }> {
  const quote = async (symbol: string) => {
    const url = new URL(TWELVE_DATA_URL);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);
    const res = await fetch(url, { signal: timeout() });
    if (!res.ok) throw new Error(`provider returned ${res.status}`);
    const body = (await res.json()) as {
      close?: string | number;
      previous_close?: string | number;
      datetime?: string;
      status?: string;
      message?: string;
    };
    if (body.status === "error") throw new Error(body.message ?? "provider error");
    const price = Number(body.close ?? body.previous_close);
    if (!isValidPrice(price)) throw new Error(`no usable price for ${symbol}`);
    const asOf = String(body.datetime ?? "").slice(0, 10);
    return { price, asOf: /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : todayIST() };
  };

  const [xau, inr] = await Promise.all([quote("XAU/USD"), quote("USD/INR")]);
  return goldPerGram(xau, inr);
}

/** Pure conversion — unit-tested without touching the network. */
export function goldPerGram(
  xauUsd: { price: number; asOf: string },
  usdInr: { price: number; asOf: string },
): { price: number; asOf: string } {
  const perGram = (xauUsd.price * usdInr.price) / GRAMS_PER_TROY_OUNCE;
  if (!isValidPrice(perGram)) throw new Error("gold reference price unavailable");
  return {
    price: Math.round(perGram * 100) / 100,
    // The older of the two legs is the honest valuation date.
    asOf: xauUsd.asOf < usdInr.asOf ? xauUsd.asOf : usdInr.asOf,
  };
}

/**
 * Fetches EOD prices for a batch of requests. A provider failure degrades to a
 * per-instrument failure entry — the caller keeps the last known good value.
 */
export async function fetchQuotes(requests: PriceRequest[]): Promise<QuoteBatch> {
  const quotes: Quote[] = [];
  const failures: QuoteFailure[] = [];
  if (requests.length === 0) return { quotes, failures };

  const amfiReqs = requests.filter((r) => r.source === "amfi");
  const goldReqs = requests.filter((r) => r.source === "gold_inr");
  const equityReqs = requests.filter((r) => r.source !== "amfi" && r.source !== "gold_inr");

  if (amfiReqs.length > 0) {
    try {
      const feed = await loadAmfiFeed();
      for (const r of amfiReqs) {
        const nav = feed.get(r.symbol.replace(/\D/g, ""));
        if (!nav) failures.push({ id: r.id, reason: `No AMFI NAV for scheme ${r.symbol}` });
        else quotes.push({ id: r.id, price: nav.price, asOf: nav.asOf, source: "amfi" });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : "AMFI feed unavailable";
      amfiReqs.forEach((r) => failures.push({ id: r.id, reason }));
    }
  }

  if (equityReqs.length > 0) {
    const apiKey = process.env["TWELVE_DATA_API_KEY"];
    if (!apiKey) {
      equityReqs.forEach((r) =>
        failures.push({ id: r.id, reason: "Market data provider is not configured" }),
      );
    } else {
      const settled = await Promise.allSettled(
        equityReqs.map((r) => fetchTwelveData(r, apiKey)),
      );
      settled.forEach((result, i) => {
        const r = equityReqs[i];
        if (result.status === "fulfilled") {
          quotes.push({ id: r.id, price: result.value.price, asOf: result.value.asOf, source: r.source, priceUnit: "per_unit" });
        } else {
          const reason =
            result.reason instanceof Error ? result.reason.message : "price unavailable";
          failures.push({ id: r.id, reason });
        }
      });
    }
  }

  if (goldReqs.length > 0) {
    const apiKey = process.env["TWELVE_DATA_API_KEY"];
    if (!apiKey) {
      goldReqs.forEach((r) =>
        failures.push({ id: r.id, reason: "Gold price provider is not configured" }),
      );
    } else {
      try {
        // One reference price serves every gram-denominated holding.
        const gold = await fetchGoldInrPerGram(apiKey);
        goldReqs.forEach((r) =>
          quotes.push({ id: r.id, price: gold.price, asOf: gold.asOf, source: "gold_inr", priceUnit: "per_gram" }),
        );
      } catch (err) {
        const reason = err instanceof Error ? err.message : "gold price unavailable";
        goldReqs.forEach((r) => failures.push({ id: r.id, reason }));
      }
    }
  }

  return { quotes, failures };
}
