import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellOff,
  BellRing,
  CalendarClock,
  CheckCircle2,
  History,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { MarkPaidDialog, type MarkPaidValues } from "@/components/finance/mark-paid-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { isoToDMY, toBill } from "@/lib/finance-mappers";
import { todayISO } from "@/lib/date-in";
import { useBills, useBillPayments } from "@/hooks/use-bills";
import { useWallets } from "@/hooks/use-wallets";
import { useFinance } from "@/store/finance-store";
import {
  classifyBills,
  daysBetweenISO,
  deriveStatus,
  FREQUENCY_LABEL,
  occurrenceKey,
  STATUS_LABEL,
  type DerivedStatus,
  type Frequency,
} from "@/services/bills";
import type { BillRow } from "@/types/database";

const STATUS_TONE: Record<DerivedStatus, "default" | "secondary" | "destructive" | "outline"> = {
  overdue: "destructive",
  due_today: "default",
  upcoming: "secondary",
  paid: "outline",
  cancelled: "outline",
};

export function Bills() {
  const { openDialog, openEditDialog } = useFinance();
  const bills = useBills();
  const payments = useBillPayments();
  const wallets = useWallets();
  const [payTarget, setPayTarget] = useState<BillRow | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const today = todayISO();
  const walletName = (id: string | null) => wallets.rows.find((w) => w.id === id)?.name ?? "—";

  const rows = useMemo(
    () =>
      bills.rows.map((row) => ({
        row,
        status: deriveStatus(row.status, (row.due_date ?? "").slice(0, 10), today),
        daysUntil: daysBetweenISO(today, (row.due_date ?? "").slice(0, 10)),
      })),
    [bills.rows, today],
  );

  // Open bills first (soonest due), then paid/cancelled ones.
  const ordered = useMemo(() => {
    const open = rows.filter((r) => r.status !== "paid" && r.status !== "cancelled");
    const closed = rows.filter((r) => r.status === "paid" || r.status === "cancelled");
    return [...open.sort((a, b) => a.daysUntil - b.daysUntil), ...closed];
  }, [rows]);

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

  const paymentsByBill = useMemo(() => {
    const map = new Map<string, typeof payments.rows>();
    payments.rows.forEach((p) => {
      map.set(p.bill_id, [...(map.get(p.bill_id) ?? []), p]);
    });
    return map;
  }, [payments.rows]);

  const addButton = (
    <Button size="sm" onClick={() => openDialog("bill")}>
      <Plus className="mr-1 h-4 w-4" /> Add bill
    </Button>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Bills & Reminders"
        description="Never miss a due date."
        actions={addButton}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Due soon"
          value={bills.isError ? "—" : String(outlook.count)}
          delta={outlook.overdueCount ? `${outlook.overdueCount} overdue` : undefined}
          icon={CalendarClock}
        />
        <StatCard
          label="Total due"
          value={bills.isError ? "—" : formatINR(outlook.total)}
          icon={Receipt}
          tone="negative"
        />
        <StatCard
          label="Next due"
          value={outlook.next ? isoToDMY(outlook.next.dueISO) : "—"}
          delta={outlook.next ? bills.rows.find((b) => b.id === outlook.next?.id)?.name : undefined}
          icon={AlertTriangle}
        />
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">All bills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bills.isLoading ? (
            <div className="p-5"><WidgetSkeleton lines={4} /></div>
          ) : bills.isError ? (
            <div className="px-5">
              <WidgetError message="Couldn't load your bills." onRetry={bills.refetch} />
            </div>
          ) : ordered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">No bills yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track rent, subscriptions, EMIs and recurring payments in one place.
                </p>
              </div>
              <Button size="sm" onClick={() => openDialog("bill")}>
                <Plus className="mr-1 h-4 w-4" /> Add your first bill
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {ordered.map(({ row, status, daysUntil }) => {
                const bill = toBill(row);
                const Icon = bill.icon;
                const history = paymentsByBill.get(row.id) ?? [];
                const isOpen = historyFor === row.id;
                const closed = status === "paid" || status === "cancelled";
                // One occurrence can only ever be paid once. A recurring bill
                // rolls forward to a NEW occurrence key, which is payable again.
                const dueKey = occurrenceKey((row.due_date ?? "").slice(0, 10));
                const occurrencePaid = history.some((p) => p.period_key === dueKey);
                const payable = !closed && !occurrencePaid;
                return (
                  <li key={row.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{bill.name}</span>
                          <Badge variant={STATUS_TONE[status]} className="text-[10px]">
                            {STATUS_LABEL[status]}
                          </Badge>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {bill.category} · {FREQUENCY_LABEL[row.frequency as Frequency]} ·{" "}
                          {walletName(row.wallet_id)}
                        </div>
                      </div>
                      <div className="hidden text-right text-xs text-muted-foreground sm:block">
                        <div>Due {bill.due}</div>
                        <div>
                          {status === "overdue"
                            ? `${Math.abs(daysUntil)}d late`
                            : status === "due_today"
                              ? "Today"
                              : `in ${daysUntil}d`}
                        </div>
                      </div>
                      <div className="w-28 text-right text-sm font-semibold tabular-nums">
                        {formatINR(bill.amount)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title={row.reminder_enabled ? "Reminders on" : "Reminders off"}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                          onClick={() =>
                            bills.update.mutate({
                              id: row.id,
                              values: { reminder_enabled: !row.reminder_enabled },
                            })
                          }
                        >
                          {row.reminder_enabled ? (
                            <BellRing className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <BellOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!payable || bills.pay.isPending}
                          title={
                            occurrencePaid && !closed
                              ? "This occurrence is already paid"
                              : undefined
                          }
                          onClick={() => payable && setPayTarget(row)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          {closed || occurrencePaid ? "Paid" : "Mark paid"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Payment history"
                          onClick={() => setHistoryFor(isOpen ? null : row.id)}
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditDialog({ kind: "bill", entity: bill })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => bills.remove.mutate(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <History className="h-3.5 w-3.5" /> Payment history
                        </div>
                        {payments.isLoading ? (
                          <WidgetSkeleton lines={2} />
                        ) : payments.isError ? (
                          <WidgetError message="Couldn't load payments." onRetry={payments.refetch} />
                        ) : history.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {[...history]
                              .sort((a, b) => (a.due_date < b.due_date ? 1 : -1))
                              .map((p) => (
                                <li key={p.id} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    Due {isoToDMY(p.due_date)} · paid {isoToDMY(p.paid_date)}
                                  </span>
                                  <span className="tabular-nums">
                                    {formatINR(Number(p.paid_amount))}
                                    {Math.abs(Number(p.paid_amount) - Number(p.expected_amount)) > 0.5 && (
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        (expected {formatINR(Number(p.expected_amount))})
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

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
