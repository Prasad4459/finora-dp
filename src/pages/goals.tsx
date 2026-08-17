import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { GoalsHero } from "@/components/finance/goals/goals-hero";
import {
  GoalsList,
  type GoalGroup,
  type GoalItem,
  type GoalStatus,
} from "@/components/finance/goals/goals-list";
import { Button } from "@/components/ui/button";
import { isoToDMY } from "@/lib/finance-mappers";
import { todayISO } from "@/lib/date-in";
import { daysBetweenISO } from "@/services/bills";
import { useGoals } from "@/hooks/use-goals";
import { useGoalContributions } from "@/hooks/use-goal-contributions";
import { toGoal } from "@/lib/finance-mappers";
import { useFinance } from "@/store/finance-store";

export function Goals() {
  const { openDialog, openEditDialog, removeGoal } = useFinance();
  const goalsData = useGoals();
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const contributions = useGoalContributions(historyFor);

  const today = todayISO();

  const goals = useMemo(() => goalsData.rows.map(toGoal), [goalsData.rows]);

  const items: GoalItem[] = useMemo(
    () =>
      goals.map((g) => {
        const dateISO = (g.date ?? "").slice(0, 10);
        const daysUntil = dateISO ? daysBetweenISO(today, dateISO) : 0;
        const remaining = Math.max(0, g.target - g.current);
        const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
        const status: GoalStatus =
          g.target > 0 && g.current >= g.target ? "reached" : daysUntil < 0 ? "overdue" : "active";
        return {
          id: g.id,
          name: g.name,
          icon: g.icon,
          target: g.target,
          current: g.current,
          remaining,
          pct,
          dateISO,
          daysUntil,
          status,
        };
      }),
    [goals, today],
  );

  const groups: GoalGroup[] = useMemo(() => {
    const bySoonest = (a: GoalItem, b: GoalItem) => a.daysUntil - b.daysUntil;
    return [
      {
        key: "overdue",
        label: "Past target date",
        hint: "Not funded by the date you set",
        tone: "destructive" as const,
        items: items.filter((i) => i.status === "overdue").sort(bySoonest),
      },
      {
        key: "active",
        label: "In progress",
        hint: "Soonest target date first",
        tone: "primary" as const,
        items: items.filter((i) => i.status === "active").sort(bySoonest),
      },
      {
        key: "reached",
        label: "Reached",
        hint: "Fully funded — nothing left to save",
        tone: "muted" as const,
        items: items.filter((i) => i.status === "reached").sort(bySoonest),
      },
    ];
  }, [items]);

  const saved = items.reduce((s, g) => s + g.current, 0);
  const target = items.reduce((s, g) => s + g.target, 0);
  const completedCount = items.filter((i) => i.status === "reached").length;
  const overdueCount = items.filter((i) => i.status === "overdue").length;
  const activeCount = items.filter((i) => i.status === "active").length;
  const next = items
    .filter((i) => i.status !== "reached" && i.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0];

  const contributionRows = useMemo(
    () =>
      contributions.rows
        .map((t) => ({
          id: t.id,
          date: (t.transaction_date ?? "").slice(0, 10),
          amount: Number(t.amount),
          note: t.notes ?? "",
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [contributions.rows],
  );

  const goalById = (id: string) => goals.find((g) => g.id === id);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden">
      <header className="space-y-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3 sm:space-y-0">
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Goals
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Save with intent — emergency fund, travel, a home. One milestone at a time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <Button size="sm" onClick={() => openDialog("goal")}>
            <Plus className="mr-1 h-4 w-4" /> New goal
          </Button>
        </div>
      </header>

      <GoalsHero
        saved={saved}
        target={target}
        activeCount={activeCount}
        completedCount={completedCount}
        overdueCount={overdueCount}
        nextLabel={next ? isoToDMY(next.dateISO) : "—"}
        nextHint={next?.name ?? "Nothing scheduled"}
        totalGoals={items.length}
        isLoading={goalsData.isLoading}
        isError={goalsData.isError}
        onRetry={goalsData.refetch}
        onAdd={() => openDialog("goal")}
      />

      <GoalsList
        groups={groups}
        totalGoals={items.length}
        isLoading={goalsData.isLoading}
        isError={goalsData.isError}
        onRetry={goalsData.refetch}
        historyFor={historyFor}
        contributions={contributionRows}
        contributionsLoading={contributions.isLoading}
        contributionsError={contributions.isError}
        onRetryContributions={contributions.refetch}
        onToggleHistory={(id) => setHistoryFor(historyFor === id ? null : id)}
        onContribute={(id) => {
          const g = goalById(id);
          if (g) openEditDialog({ kind: "contribution", entity: g });
        }}
        onEdit={(id) => {
          const g = goalById(id);
          if (g) openEditDialog({ kind: "goal", entity: g });
        }}
        onRemove={(id) => removeGoal(id)}
        onAdd={() => openDialog("goal")}
      />
    </div>
  );
}
