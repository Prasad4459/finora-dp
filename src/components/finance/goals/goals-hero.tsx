// Presentation only — every figure is computed by the Goals page.
import { PiggyBank, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative" | "primary";
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-xl",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
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

export function GoalsHero({
  saved,
  target,
  activeCount,
  completedCount,
  overdueCount,
  nextLabel,
  nextHint,
  totalGoals,
  isLoading,
  isError,
  onRetry,
  onAdd,
}: {
  saved: number;
  target: number;
  activeCount: number;
  completedCount: number;
  overdueCount: number;
  nextLabel: string;
  nextHint?: string;
  totalGoals: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAdd: () => void;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const remaining = Math.max(0, target - saved);

  return (
    <Card className="border-border/70">
      <CardContent className="p-5 sm:p-6">
        {isError ? (
          <WidgetError message="Couldn't load your goals." onRetry={onRetry} />
        ) : isLoading ? (
          <WidgetSkeleton lines={5} />
        ) : totalGoals === 0 ? (
          <WidgetEmpty
            message="No goals yet. Add an emergency fund, a trip or a down payment to track how close you are."
            actionLabel="Create your first goal"
            onAction={onAdd}
          />
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Saved towards goals
                </div>
                <div className="mt-1 break-words font-display text-3xl font-semibold tabular-nums sm:text-4xl">
                  {formatINR(saved)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  of {formatINR(target)} target · {formatINR(remaining)} to go
                </div>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4">
              <Progress value={pct} />
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                <span className="tabular-nums">{pct}% funded overall</span>
                <span>
                  {completedCount > 0 ? `${completedCount} reached` : "Keep going"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border/60 pt-4 sm:grid-cols-4">
              <Metric label="In progress" value={String(activeCount)} hint="Still funding" />
              <Metric
                label="Reached"
                value={String(completedCount)}
                hint="Fully funded"
                tone={completedCount > 0 ? "positive" : "neutral"}
              />
              <Metric
                label="Past target date"
                value={String(overdueCount)}
                hint={overdueCount > 0 ? "Needs a new plan" : "All on track"}
                tone={overdueCount > 0 ? "negative" : "neutral"}
              />
              <Metric label="Next target date" value={nextLabel} hint={nextHint} tone="primary" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const GoalsHeroIcons = { PiggyBank, TrendingUp };
