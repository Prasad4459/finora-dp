// Presentation only — statuses, ordering and payability are decided by the page
// using services/bills. No bill, recurrence or reminder logic lives here.
import {
  AlertTriangle,
  BellOff,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  History,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { formatINR } from "@/lib/format";
import { isoToDMY } from "@/lib/finance-mappers";
import { cn } from "@/lib/utils";
import { FREQUENCY_LABEL, STATUS_LABEL, type DerivedStatus, type Frequency } from "@/services/bills";
import type { BillPaymentRow } from "@/types/database";

export type BillItem = {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  amount: number;
  dueISO: string;
  daysUntil: number;
  status: DerivedStatus;
  frequency: Frequency;
  walletName: string;
  reminderEnabled: boolean;
  reminderDays: number;
  payable: boolean;
  history: BillPaymentRow[];
};

export type BillGroup = {
  key: string;
  label: string;
  hint: string;
  tone: "destructive" | "primary" | "muted";
  items: BillItem[];
};

const STATUS_TONE: Record<DerivedStatus, "default" | "secondary" | "destructive" | "outline"> = {
  overdue: "destructive",
  due_today: "default",
  upcoming: "secondary",
  paid: "outline",
  cancelled: "outline",
};

function timingLabel(item: BillItem) {
  if (item.status === "paid") return "Paid";
  if (item.status === "cancelled") return "Cancelled";
  if (item.status === "overdue") {
    const d = Math.abs(item.daysUntil);
    return `${d} ${d === 1 ? "day" : "days"} late`;
  }
  if (item.status === "due_today") return "Due today";
  return `in ${item.daysUntil} ${item.daysUntil === 1 ? "day" : "days"}`;
}

function reminderLabel(item: BillItem) {
  if (!item.reminderEnabled) return "Reminders off";
  const d = Math.max(1, item.reminderDays);
  return `Reminder ${d} ${d === 1 ? "day" : "days"} before`;
}

function BillRowCard({
  item,
  historyOpen,
  paymentsLoading,
  paymentsError,
  onRetryPayments,
  onToggleHistory,
  onToggleReminder,
  onPay,
  onEdit,
  onRemove,
  payPending,
}: {
  item: BillItem;
  historyOpen: boolean;
  paymentsLoading: boolean;
  paymentsError: boolean;
  onRetryPayments: () => void;
  onToggleHistory: () => void;
  onToggleReminder: () => void;
  onPay: () => void;
  onEdit: () => void;
  onRemove: () => void;
  payPending: boolean;
}) {
  const Icon = item.icon;
  const recurring = item.frequency !== "one_time";

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            item.status === "overdue"
              ? "bg-destructive/10 text-destructive"
              : "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 break-words text-sm font-medium">{item.name}</span>
                <Badge variant={STATUS_TONE[item.status]} className="text-[10px]">
                  {STATUS_LABEL[item.status]}
                </Badge>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {item.category} · {item.walletName}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-base font-semibold tabular-nums">
                {formatINR(item.amount)}
              </div>
              <div
                className={cn(
                  "text-xs tabular-nums",
                  item.status === "overdue"
                    ? "text-destructive"
                    : item.status === "due_today"
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {isoToDMY(item.dueISO)} · {timingLabel(item)}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {recurring ? <Repeat className="h-3 w-3" /> : <CalendarCheck className="h-3 w-3" />}
              {recurring ? FREQUENCY_LABEL[item.frequency] : "One-time"}
            </span>
            <button
              type="button"
              onClick={onToggleReminder}
              aria-pressed={item.reminderEnabled}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors",
                item.reminderEnabled
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
              title={
                item.reminderEnabled
                  ? "Reminders on — tap to turn off"
                  : "Reminders off — tap to turn on"
              }
            >
              {item.reminderEnabled ? (
                <BellRing className="h-3 w-3" />
              ) : (
                <BellOff className="h-3 w-3" />
              )}
              {reminderLabel(item)}
            </button>
            {item.history.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <History className="h-3 w-3" />
                {item.history.length} paid
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={item.status === "overdue" ? "default" : "outline"}
              disabled={!item.payable || payPending}
              title={!item.payable ? "This occurrence is already paid" : undefined}
              onClick={() => item.payable && onPay()}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              {item.payable ? "Mark paid" : "Paid"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleHistory}>
              <History className="mr-1 h-3.5 w-3.5" />
              {historyOpen ? "Hide history" : "History"}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${item.name}`} onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={`Delete ${item.name}`}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {historyOpen && (
            <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Payment history
              </div>
              {paymentsLoading ? (
                <WidgetSkeleton lines={2} />
              ) : paymentsError ? (
                <WidgetError message="Couldn't load payments." onRetry={onRetryPayments} />
              ) : item.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {[...item.history]
                    .sort((a, b) => (a.due_date < b.due_date ? 1 : -1))
                    .map((p) => (
                      <li
                        key={p.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-sm"
                      >
                        <span className="min-w-0 text-muted-foreground">
                          Due {isoToDMY(p.due_date)} · paid {isoToDMY(p.paid_date)}
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          {formatINR(Number(p.paid_amount))}
                          {Math.abs(Number(p.paid_amount) - Number(p.expected_amount)) > 0.5 && (
                            <span className="block text-xs text-muted-foreground">
                              expected {formatINR(Number(p.expected_amount))}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function BillsList({
  groups,
  totalBills,
  isLoading,
  isError,
  onRetry,
  paymentsLoading,
  paymentsError,
  onRetryPayments,
  historyFor,
  onToggleHistory,
  onToggleReminder,
  onPay,
  onEdit,
  onRemove,
  onAdd,
  payPending,
}: {
  groups: BillGroup[];
  totalBills: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  paymentsLoading: boolean;
  paymentsError: boolean;
  onRetryPayments: () => void;
  historyFor: string | null;
  onToggleHistory: (id: string) => void;
  onToggleReminder: (item: BillItem) => void;
  onPay: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  payPending: boolean;
}) {
  const visible = groups.filter((g) => g.items.length > 0);

  return (
    <Card className="border-border/70">
      <CardHeader className="gap-1 pb-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">All bills</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Grouped by urgency · reminders appear in your notifications
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" /> Add bill
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isError ? (
          <div className="px-5 pb-5">
            <WidgetError message="Couldn't load your bills." onRetry={onRetry} />
          </div>
        ) : isLoading ? (
          <div className="px-5 pb-5">
            <WidgetSkeleton lines={5} />
          </div>
        ) : totalBills === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="max-w-sm">
              <p className="text-sm font-semibold">No bills yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Track rent, subscriptions, EMIs and recurring payments in one place, and get a
                reminder before every due date.
              </p>
            </div>
            <Button size="sm" onClick={onAdd}>
              <Plus className="mr-1 h-4 w-4" /> Add your first bill
            </Button>
          </div>
        ) : (
          visible.map((group) => (
            <section key={group.key} className="border-t border-border first:border-t-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-muted/40 px-4 py-2 sm:px-5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
                    group.tone === "destructive" && "text-destructive",
                    group.tone === "primary" && "text-primary",
                  )}
                >
                  {group.tone === "destructive" && <AlertTriangle className="h-3.5 w-3.5" />}
                  {group.label}
                </span>
                <span className="text-xs text-muted-foreground">{group.hint}</span>
              </div>
              <ul className="divide-y divide-border">
                {group.items.map((item) => (
                  <BillRowCard
                    key={item.id}
                    item={item}
                    historyOpen={historyFor === item.id}
                    paymentsLoading={paymentsLoading}
                    paymentsError={paymentsError}
                    onRetryPayments={onRetryPayments}
                    onToggleHistory={() => onToggleHistory(item.id)}
                    onToggleReminder={() => onToggleReminder(item)}
                    onPay={() => onPay(item.id)}
                    onEdit={() => onEdit(item.id)}
                    onRemove={() => onRemove(item.id)}
                    payPending={payPending}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}
