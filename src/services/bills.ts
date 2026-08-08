// Pure, React-free bill due-date logic. The dashboard never decides on its own
// what "upcoming" means — this service owns the window and the urgency labels.

export type BillUrgency = "overdue" | "today" | "soon" | "later";

/** Bills are considered "upcoming" inside this many days from today (IST). */
export const UPCOMING_WINDOW_DAYS = 14;

const MS_PER_DAY = 86_400_000;

/** Whole days from ISO date `a` to ISO date `b` (negative = b is in the past). */
export function daysBetweenISO(a: string, b: string): number {
  const from = Date.parse(`${a.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${b.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / MS_PER_DAY);
}

export function urgencyOf(daysUntil: number, windowDays = UPCOMING_WINDOW_DAYS): BillUrgency {
  if (daysUntil < 0) return "overdue";
  if (daysUntil === 0) return "today";
  return daysUntil <= windowDays ? "soon" : "later";
}

export const URGENCY_LABEL: Record<BillUrgency, string> = {
  overdue: "Overdue",
  today: "Due today",
  soon: "Due soon",
  later: "Scheduled",
};

export type BillInput = {
  id: string;
  amount: number;
  /** ISO "YYYY-MM-DD" due date. */
  dueISO: string;
  /** Raw bill status — paid / cancelled bills are never "upcoming". */
  status: string;
};

export type ClassifiedBill<T extends BillInput> = T & {
  daysUntil: number;
  urgency: BillUrgency;
};

export type BillsOutlook<T extends BillInput> = {
  /** Overdue + due today + due within the window, soonest first. */
  upcoming: ClassifiedBill<T>[];
  /** Bills scheduled beyond the window (not shown on the dashboard). */
  later: ClassifiedBill<T>[];
  total: number;
  count: number;
  overdueCount: number;
  dueTodayCount: number;
  /** Soonest unpaid bill, if any. */
  next: ClassifiedBill<T> | null;
};

const OPEN_STATUSES = ["upcoming", "scheduled", "overdue", "due"];

export function classifyBills<T extends BillInput>(
  bills: T[],
  today: string,
  windowDays = UPCOMING_WINDOW_DAYS,
): BillsOutlook<T> {
  const open = bills
    .filter((b) => OPEN_STATUSES.includes(String(b.status).toLowerCase()))
    .map((b) => {
      const daysUntil = daysBetweenISO(today, b.dueISO);
      return { ...b, daysUntil, urgency: urgencyOf(daysUntil, windowDays) };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const upcoming = open.filter((b) => b.urgency !== "later");
  return {
    upcoming,
    later: open.filter((b) => b.urgency === "later"),
    total: upcoming.reduce((s, b) => s + b.amount, 0),
    count: upcoming.length,
    overdueCount: upcoming.filter((b) => b.urgency === "overdue").length,
    dueTodayCount: upcoming.filter((b) => b.urgency === "today").length,
    next: open[0] ?? null,
  };
}
