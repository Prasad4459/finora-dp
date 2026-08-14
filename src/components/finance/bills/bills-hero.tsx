// Presentation only — every figure is computed by services/bills.
import { AlertTriangle, BellRing, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UPCOMING_WINDOW_DAYS } from "@/services/bills";

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "negative" | "primary";
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-xl",
          tone === "negative" && "text-destructive",
          tone === "primary" && "text-primary",
        )}
      >
        {value}
      </div>
      {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function BillsHero({
  total,
  count,
  overdueCount,
  overdueAmount,
  dueTodayCount,
  dueTodayAmount,
  nextLabel,
  nextHint,
  remindersOn,
  totalBills,
  isLoading,
  isError,
  onRetry,
  onAdd,
}: {
  total: number;
  count: number;
  overdueCount: number;
  overdueAmount: number;
  dueTodayCount: number;
  dueTodayAmount: number;
  nextLabel: string;
  nextHint?: string;
  remindersOn: number;
  totalBills: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAdd: () => void;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-5 sm:p-6">
        {isError ? (
          <WidgetError message="Couldn't load your bills." onRetry={onRetry} />
        ) : isLoading ? (
          <WidgetSkeleton lines={5} />
        ) : totalBills === 0 ? (
          <WidgetEmpty
            message="No bills yet. Add rent, EMIs, subscriptions and utility bills to see what's due and get reminders before the date."
            actionLabel="Add your first bill"
            onAction={onAdd}
            className="py-2"
          />
        ) : (
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Due in the next {UPCOMING_WINDOW_DAYS} days
            </div>
            <div className="mt-1 break-words font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {formatINR(total)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                {count} {count === 1 ? "bill" : "bills"}
              </span>
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {overdueCount} overdue
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <BellRing className="h-3.5 w-3.5" />
                Reminders on for {remindersOn} of {totalBills}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border/70 pt-5 sm:grid-cols-3">
              <Metric
                label="Overdue"
                value={overdueCount ? formatINR(overdueAmount) : "None"}
                hint={overdueCount ? `${overdueCount} past due date` : "Nothing past due"}
                tone={overdueCount ? "negative" : "neutral"}
              />
              <Metric
                label="Due today"
                value={dueTodayCount ? formatINR(dueTodayAmount) : "None"}
                hint={
                  dueTodayCount
                    ? `${dueTodayCount} ${dueTodayCount === 1 ? "bill" : "bills"} today`
                    : "Nothing today"
                }
                tone={dueTodayCount ? "primary" : "neutral"}
              />
              <Metric label="Next due" value={nextLabel} hint={nextHint} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
