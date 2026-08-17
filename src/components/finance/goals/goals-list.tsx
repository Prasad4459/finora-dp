// Presentation only — grouping, progress and timing are computed by the page.
import { CalendarClock, History, IndianRupee, Pencil, Plus, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { formatINR } from "@/lib/format";
import { isoToDMY } from "@/lib/finance-mappers";
import { cn } from "@/lib/utils";

export type GoalStatus = "reached" | "overdue" | "active";

export type GoalItem = {
  id: string;
  name: string;
  icon: LucideIcon;
  target: number;
  current: number;
  remaining: number;
  pct: number;
  dateISO: string;
  daysUntil: number;
  status: GoalStatus;
};

export type GoalContribution = { id: string; date: string; amount: number; note: string };

export type GoalGroup = {
  key: string;
  label: string;
  hint: string;
  tone: "destructive" | "primary" | "muted";
  items: GoalItem[];
};

const STATUS_LABEL: Record<GoalStatus, string> = {
  reached: "Reached",
  overdue: "Past target date",
  active: "In progress",
};

const STATUS_TONE: Record<GoalStatus, "default" | "secondary" | "destructive" | "outline"> = {
  reached: "outline",
  overdue: "destructive",
  active: "secondary",
};

function timingLabel(item: GoalItem) {
  if (item.status === "reached") return "Fully funded";
  if (item.daysUntil < 0) {
    const d = Math.abs(item.daysUntil);
    return `${d} ${d === 1 ? "day" : "days"} past`;
  }
  if (item.daysUntil === 0) return "Target date today";
  if (item.daysUntil < 60) return `in ${item.daysUntil} ${item.daysUntil === 1 ? "day" : "days"}`;
  const months = Math.round(item.daysUntil / 30);
  return `in ${months} ${months === 1 ? "month" : "months"}`;
}

function GoalCard({
  item,
  historyOpen,
  contributions,
  contributionsLoading,
  contributionsError,
  onRetryContributions,
  onToggleHistory,
  onContribute,
  onEdit,
  onRemove,
}: {
  item: GoalItem;
  historyOpen: boolean;
  contributions: GoalContribution[];
  contributionsLoading: boolean;
  contributionsError: boolean;
  onRetryContributions: () => void;
  onToggleHistory: () => void;
  onContribute: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const Icon = item.icon;

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            item.status === "overdue"
              ? "bg-destructive/10 text-destructive"
              : item.status === "reached"
                ? "bg-primary/10 text-primary"
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
              <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {formatINR(item.current)} of {formatINR(item.target)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-base font-semibold tabular-nums">
                {item.status === "reached" ? formatINR(item.target) : formatINR(item.remaining)}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.status === "reached" ? "target met" : "still to save"}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <Progress value={item.pct} />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular-nums">{item.pct}% funded</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 tabular-nums",
                  item.status === "overdue" && "text-destructive",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {isoToDMY(item.dateISO)} · {timingLabel(item)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={item.status === "reached" ? "outline" : "default"}
              onClick={onContribute}
              title="Move money into this goal"
            >
              <IndianRupee className="mr-1 h-3.5 w-3.5" />
              Contribute
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleHistory}>
              <History className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">{historyOpen ? "Hide history" : "History"}</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={`Edit ${item.name}`}
              onClick={onEdit}
            >
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
                <History className="h-3.5 w-3.5" /> Contribution history
              </div>
              {contributionsLoading ? (
                <WidgetSkeleton lines={2} />
              ) : contributionsError ? (
                <WidgetError message="Couldn't load contributions." onRetry={onRetryContributions} />
              ) : contributions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contributions recorded yet. Use Contribute to move money into this goal.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {contributions.map((c) => (
                    <li
                      key={c.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        {isoToDMY(c.date)}
                        {c.note ? ` · ${c.note}` : ""}
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        {formatINR(c.amount)}
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

export function GoalsList({
  groups,
  totalGoals,
  isLoading,
  isError,
  onRetry,
  historyFor,
  contributions,
  contributionsLoading,
  contributionsError,
  onRetryContributions,
  onToggleHistory,
  onContribute,
  onEdit,
  onRemove,
  onAdd,
}: {
  groups: GoalGroup[];
  totalGoals: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  historyFor: string | null;
  contributions: GoalContribution[];
  contributionsLoading: boolean;
  contributionsError: boolean;
  onRetryContributions: () => void;
  onToggleHistory: (id: string) => void;
  onContribute: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  if (isError) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-5">
          <WidgetError message="Couldn't load your goals." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-5">
          <WidgetSkeleton lines={6} />
        </CardContent>
      </Card>
    );
  }

  if (totalGoals === 0) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-5">
          <WidgetEmpty
            message="Goals turn saving into a plan. Start with an emergency fund of 6 months of expenses."
            actionLabel="Create a goal"
            onAction={onAdd}
          />
        </CardContent>
      </Card>
    );
  }

  const visible = groups.filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {visible.map((group) => (
        <Card key={group.key} className="overflow-hidden border-border/70">
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    group.tone === "destructive"
                      ? "bg-destructive"
                      : group.tone === "primary"
                        ? "bg-primary"
                        : "bg-muted-foreground/40",
                  )}
                />
                <h2 className="truncate text-sm font-semibold">{group.label}</h2>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{group.hint}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {group.items.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {group.items.map((item) => (
                <GoalCard
                  key={item.id}
                  item={item}
                  historyOpen={historyFor === item.id}
                  contributions={historyFor === item.id ? contributions : []}
                  contributionsLoading={historyFor === item.id && contributionsLoading}
                  contributionsError={historyFor === item.id && contributionsError}
                  onRetryContributions={onRetryContributions}
                  onToggleHistory={() => onToggleHistory(item.id)}
                  onContribute={() => onContribute(item.id)}
                  onEdit={() => onEdit(item.id)}
                  onRemove={() => onRemove(item.id)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" /> New goal
        </Button>
      </div>
    </div>
  );
}
