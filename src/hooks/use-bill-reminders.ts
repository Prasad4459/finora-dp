import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsRepo } from "@/repositories";
import { billsQueryOptions } from "./use-bills";
import { notificationsQueryOptions } from "./use-notifications";
import { financeKeys } from "./query-keys";
import { formatINR } from "@/lib/format";
import { todayISO } from "@/lib/date-in";
import { deriveStatus, reminderFor, reminderKey, type ReminderKind } from "@/services/bills";

const TEXT: Record<ReminderKind, (name: string, amount: string, days: number) => string> = {
  due_soon: (name, amount, days) =>
    `Your ${name} bill of ${amount} is due in ${days} day${days === 1 ? "" : "s"}.`,
  due_today: (name, amount) => `Your ${name} payment of ${amount} is due today.`,
  overdue: (name, amount) => `Your ${name} payment of ${amount} is overdue.`,
};

/**
 * In-app bill reminders. Runs once per session: for every bill whose reminder
 * window has been reached (IST dates only) it creates a notification keyed by
 * bill + occurrence + kind, so the same reminder can never appear twice.
 */
export function useBillReminders() {
  const qc = useQueryClient();
  const bills = useQuery(billsQueryOptions);
  const notifications = useQuery(notificationsQueryOptions);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !bills.data || !notifications.data) return;
    done.current = true;

    const today = todayISO();
    const known = new Set(
      notifications.data.map((n) => n.dedupe_key).filter((k): k is string => Boolean(k)),
    );

    const pending = bills.data.flatMap((bill) => {
      const dueISO = (bill.due_date ?? "").slice(0, 10);
      const status = deriveStatus(bill.status, dueISO, today);
      const kind = reminderFor({
        dueISO,
        today,
        reminderEnabled: bill.reminder_enabled,
        reminderDaysBefore: bill.reminder_days_before,
        status,
      });
      if (!kind) return [];
      const key = reminderKey(bill.id, dueISO, kind);
      if (known.has(key)) return [];
      const days = Math.max(
        0,
        Math.round((Date.parse(`${dueISO}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000),
      );
      return [
        {
          type: "bill_reminder" as const,
          title: bill.name,
          message: TEXT[kind](bill.name, formatINR(Number(bill.amount)), days),
          dedupe_key: key,
          link: "/bills",
          is_read: false,
        },
      ];
    });

    if (pending.length === 0) return;
    void Promise.all(
      // A duplicate key simply means the reminder already exists — ignore it.
      pending.map((n) => notificationsRepo.create(n).catch(() => undefined)),
    ).then(() => qc.invalidateQueries({ queryKey: financeKeys.notifications }));
  }, [bills.data, notifications.data, qc]);
}
