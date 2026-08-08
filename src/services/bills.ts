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

/* ---------------- recurrence ---------------- */

export type Frequency = "one_time" | "weekly" | "monthly" | "quarterly" | "half_yearly" | "yearly";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  one_time: "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
};

export const FREQUENCY_OPTIONS = Object.values(FREQUENCY_LABEL);

export const frequencyFromLabel = (label: string): Frequency =>
  (Object.keys(FREQUENCY_LABEL) as Frequency[]).find((k) => FREQUENCY_LABEL[k] === label) ?? "monthly";

const MONTHS_BY_FREQUENCY: Partial<Record<Frequency, number>> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

/**
 * The next occurrence of a recurring bill. The recurring DEFINITION stays the
 * source of truth — no future rows are ever materialised.
 * Returns null for one-time bills (they have no next occurrence).
 */
export function nextDueDate(dueISO: string, frequency: Frequency): string | null {
  const iso = (dueISO ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  if (frequency === "one_time") return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (frequency === "weekly") {
    const next = new Date(Date.UTC(y, m - 1, d + 7));
    return next.toISOString().slice(0, 10);
  }
  const step = MONTHS_BY_FREQUENCY[frequency] ?? 1;
  const zero = (y * 12 + (m - 1)) + step;
  const ny = Math.floor(zero / 12);
  const nm = (zero % 12) + 1;
  // Clamp the day so "31 Jan + 1 month" lands on the last day of February.
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, lastDay);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/** Stable identifier of ONE occurrence of a bill (used to prevent double pay). */
export const occurrenceKey = (dueISO: string) => (dueISO ?? "").slice(0, 10);

/* ---------------- derived status ---------------- */

export type DerivedStatus = "upcoming" | "due_today" | "overdue" | "paid" | "cancelled";

export const STATUS_LABEL: Record<DerivedStatus, string> = {
  upcoming: "Upcoming",
  due_today: "Due Today",
  overdue: "Overdue",
  paid: "Paid",
  cancelled: "Cancelled",
};

/**
 * A bill's status is DERIVED from its due date and payment state — the stored
 * status only carries the terminal states (paid / cancelled).
 */
export function deriveStatus(stored: string, dueISO: string, today: string): DerivedStatus {
  const s = String(stored ?? "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "cancelled") return "cancelled";
  const days = daysBetweenISO(today, dueISO);
  if (days < 0) return "overdue";
  if (days === 0) return "due_today";
  return "upcoming";
}

/* ---------------- reminders ---------------- */

export type ReminderKind = "due_soon" | "due_today" | "overdue";

/** Whether a reminder is due for this bill today, and of which kind. */
export function reminderFor(input: {
  dueISO: string;
  today: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  status: DerivedStatus;
}): ReminderKind | null {
  if (!input.reminderEnabled) return null;
  if (input.status === "paid" || input.status === "cancelled") return null;
  const days = daysBetweenISO(input.today, input.dueISO);
  if (days < 0) return "overdue";
  if (days === 0) return "due_today";
  return days <= Math.max(1, input.reminderDaysBefore) ? "due_soon" : null;
}

/** One notification per bill occurrence per kind — never duplicated. */
export const reminderKey = (billId: string, dueISO: string, kind: ReminderKind) =>
  `bill:${billId}:${occurrenceKey(dueISO)}:${kind}`;
