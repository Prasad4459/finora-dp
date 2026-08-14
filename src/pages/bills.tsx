import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { BillsHero } from "@/components/finance/bills/bills-hero";
import { BillsList, type BillGroup, type BillItem } from "@/components/finance/bills/bills-list";
import { MarkPaidDialog, type MarkPaidValues } from "@/components/finance/mark-paid-dialog";
import { Button } from "@/components/ui/button";
import { isoToDMY, toBill } from "@/lib/finance-mappers";
import { todayISO } from "@/lib/date-in";
import { useBills, useBillPayments } from "@/hooks/use-bills";
import { useWallets } from "@/hooks/use-wallets";
import { useFinance } from "@/store/finance-store";
import {
  classifyBills,
  daysBetweenISO,
  deriveStatus,
  occurrenceKey,
  UPCOMING_WINDOW_DAYS,
  type Frequency,
} from "@/services/bills";
import type { BillRow } from "@/types/database";

export function Bills() {
  const { openDialog, openEditDialog } = useFinance();
  const bills = useBills();
  const payments = useBillPayments();
  const wallets = useWallets();
  const [payTarget, setPayTarget] = useState<BillRow | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const today = todayISO();
  const walletName = (id: string | null) => wallets.rows.find((w) => w.id === id)?.name ?? "No account set";

  const paymentsByBill = useMemo(() => {
    const map = new Map<string, typeof payments.rows>();
    payments.rows.forEach((p) => {
      map.set(p.bill_id, [...(map.get(p.bill_id) ?? []), p]);
    });
    return map;
  }, [payments.rows]);

  const items: BillItem[] = useMemo(
    () =>
      bills.rows.map((row) => {
        const dueISO = (row.due_date ?? "").slice(0, 10);
        const status = deriveStatus(row.status, dueISO, today);
        const bill = toBill(row);
        const history = paymentsByBill.get(row.id) ?? [];
        const closed = status === "paid" || status === "cancelled";
        // One occurrence can only ever be paid once. A recurring bill rolls
        // forward to a NEW occurrence key, which is payable again.
        const occurrencePaid = history.some((p) => p.period_key === occurrenceKey(dueISO));
        return {
          id: row.id,
          name: bill.name,
          category: bill.category,
          icon: bill.icon,
          amount: bill.amount,
          dueISO,
          daysUntil: daysBetweenISO(today, dueISO),
          status,
          frequency: row.frequency as Frequency,
          walletName: walletName(row.wallet_id),
          reminderEnabled: row.reminder_enabled,
          reminderDays: row.reminder_days_before,
          payable: !closed && !occurrencePaid,
          history,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bills.rows, paymentsByBill, today, wallets.rows],
  );

  const groups: BillGroup[] = useMemo(() => {
    const bySoonest = (a: BillItem, b: BillItem) => a.daysUntil - b.daysUntil;
    const open = items.filter((i) => i.status !== "paid" && i.status !== "cancelled");
    const overdue = open.filter((i) => i.status === "overdue").sort(bySoonest);
    const dueToday = open.filter((i) => i.status === "due_today");
    const soon = open
      .filter((i) => i.status === "upcoming" && i.daysUntil <= UPCOMING_WINDOW_DAYS)
      .sort(bySoonest);
    const later = open
      .filter((i) => i.status === "upcoming" && i.daysUntil > UPCOMING_WINDOW_DAYS)
      .sort(bySoonest);
    const closed = items.filter((i) => i.status === "paid" || i.status === "cancelled");
    return [
      { key: "overdue", label: "Overdue", hint: "Pay these first", tone: "destructive", items: overdue },
      { key: "today", label: "Due today", hint: "Due on today's date", tone: "primary", items: dueToday },
      {
        key: "soon",
        label: "Due soon",
        hint: `Next ${UPCOMING_WINDOW_DAYS} days`,
        tone: "muted",
        items: soon,
      },
      { key: "later", label: "Scheduled", hint: "Further ahead", tone: "muted", items: later },
      { key: "closed", label: "Paid & closed", hint: "No action needed", tone: "muted", items: closed },
    ];
  }, [items]);

  const outlook = useMemo(
    () =>
      classifyBills(
        bills.rows.map((b) => ({
          id: b.id,
          amount: Number(b.amount),
          dueISO: (b.due_date ?? "").slice(0, 10),
          status: b.status,
        })),
        today,
      ),
    [bills.rows, today],
  );

  const overdueAmount = outlook.upcoming
    .filter((b) => b.urgency === "overdue")
    .reduce((s, b) => s + b.amount, 0);
  const dueTodayAmount = outlook.upcoming
    .filter((b) => b.urgency === "today")
    .reduce((s, b) => s + b.amount, 0);
  const nextBill = outlook.next ? bills.rows.find((b) => b.id === outlook.next?.id) : undefined;
  const remindersOn = bills.rows.filter((b) => b.reminder_enabled).length;

  const byId = (id: string) => bills.rows.find((r) => r.id === id);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden">
      <header className="space-y-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3 sm:space-y-0">
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Bills &amp; Reminders
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Rent, EMIs, subscriptions and utilities — see what's due and never miss a date.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <Button size="sm" onClick={() => openDialog("bill")}>
            <Plus className="mr-1 h-4 w-4" /> Add bill
          </Button>
        </div>
      </header>

      <BillsHero
        total={outlook.total}
        count={outlook.count}
        overdueCount={outlook.overdueCount}
        overdueAmount={overdueAmount}
        dueTodayCount={outlook.dueTodayCount}
        dueTodayAmount={dueTodayAmount}
        nextLabel={outlook.next ? isoToDMY(outlook.next.dueISO) : "—"}
        nextHint={nextBill?.name ?? "Nothing scheduled"}
        remindersOn={remindersOn}
        totalBills={bills.rows.length}
        isLoading={bills.isLoading}
        isError={bills.isError}
        onRetry={bills.refetch}
        onAdd={() => openDialog("bill")}
      />

      <BillsList
        groups={groups}
        totalBills={bills.rows.length}
        isLoading={bills.isLoading}
        isError={bills.isError}
        onRetry={bills.refetch}
        paymentsLoading={payments.isLoading}
        paymentsError={payments.isError}
        onRetryPayments={payments.refetch}
        historyFor={historyFor}
        onToggleHistory={(id) => setHistoryFor(historyFor === id ? null : id)}
        onToggleReminder={(item) =>
          bills.update.mutate({ id: item.id, values: { reminder_enabled: !item.reminderEnabled } })
        }
        onPay={(id) => {
          const row = byId(id);
          if (row) setPayTarget(row);
        }}
        onEdit={(id) => {
          const row = byId(id);
          if (row) openEditDialog({ kind: "bill", entity: toBill(row) });
        }}
        onRemove={(id) => bills.remove.mutate(id)}
        onAdd={() => openDialog("bill")}
        payPending={bills.pay.isPending}
      />

      <MarkPaidDialog
        bill={payTarget}
        wallets={wallets.rows}
        pending={bills.pay.isPending}
        onClose={() => setPayTarget(null)}
        onConfirm={(v: MarkPaidValues) => {
          if (!payTarget) return;
          bills.pay.mutate(
            {
              bill: payTarget,
              occurrenceDate: occurrenceKey((payTarget.due_date ?? "").slice(0, 10)),
              amount: v.amount,
              walletId: v.walletId,
              paidDate: v.paidDate,
            },
            { onSuccess: () => setPayTarget(null) },
          );
        }}
      />
    </div>
  );
}
