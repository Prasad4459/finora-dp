// Single source of truth for every financial date/month calculation.
// Finora is an India-first product: the financial calendar is ALWAYS the
// Asia/Kolkata (IST, UTC+5:30) calendar, never the browser timezone and never
// UTC. A transaction entered at 01:00 IST belongs to that IST calendar day —
// using `toISOString()` would have pushed it to the previous day.

export const IST_TIMEZONE = "Asia/Kolkata";

/** en-CA gives an ISO-shaped "YYYY-MM-DD" string for the requested timezone. */
const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type MonthRef = { year: number; month: number };

/** Today's date in IST as "YYYY-MM-DD". */
export const todayISO = (now: Date = new Date()) => istDateFormatter.format(now);

/** Current IST year/month. */
export function currentMonth(now: Date = new Date()): MonthRef {
  const [year, month] = todayISO(now).split("-").map(Number);
  return { year, month };
}

export const monthKeyOf = (ref: MonthRef) => `${ref.year}-${String(ref.month).padStart(2, "0")}`;

/** "YYYY-MM" for the current IST month. */
export const currentMonthKey = (now: Date = new Date()) => monthKeyOf(currentMonth(now));

export const parseMonthKey = (key: string): MonthRef => {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
};

/** Shifts a month reference by `delta` months (negative = back in time). */
export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const zero = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}

const daysInMonth = (ref: MonthRef) => new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate();

/** Inclusive [from, to] ISO boundaries of an IST calendar month. */
export function monthRange(ref: MonthRef): { from: string; to: string } {
  const mm = String(ref.month).padStart(2, "0");
  return {
    from: `${ref.year}-${mm}-01`,
    to: `${ref.year}-${mm}-${String(daysInMonth(ref)).padStart(2, "0")}`,
  };
}

/** Inclusive year-to-date range: 1 January .. today, in IST. */
export function ytdRange(now: Date = new Date()): { from: string; to: string } {
  const today = todayISO(now);
  return { from: `${today.slice(0, 4)}-01-01`, to: today };
}

/** The last `count` IST months, oldest first, ending with the current month. */
export function lastMonths(count: number, now: Date = new Date()): MonthRef[] {
  const current = currentMonth(now);
  return Array.from({ length: count }, (_, i) => addMonths(current, i - (count - 1)));
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Jul" or "Jul 2026". */
export const monthShortLabel = (ref: MonthRef) => MONTH_LABELS[ref.month - 1] ?? "";
export const monthLongLabel = (ref: MonthRef) => `${monthShortLabel(ref)} ${ref.year}`;

/** True when an ISO date falls inside the given IST month. */
export const isInMonth = (isoDate: string, key = currentMonthKey()) => (isoDate ?? "").startsWith(key);

/** Smallest/largest of a list of month refs (used to size an aggregate query). */
export const minMonth = (refs: MonthRef[]): MonthRef =>
  refs.reduce((a, b) => (b.year * 12 + b.month < a.year * 12 + a.month ? b : a));
export const maxMonth = (refs: MonthRef[]): MonthRef =>
  refs.reduce((a, b) => (b.year * 12 + b.month > a.year * 12 + a.month ? b : a));