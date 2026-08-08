import { Plus, PieChart, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { budgetProgress, percentOf } from "@/services/finance";
import { cn } from "@/lib/utils";
import { useFinance } from "@/store/finance-store";


export function Budget() {
  const { budgets, openDialog, openEditDialog, removeBudget } = useFinance();
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const overspent = budgets.filter((b) => budgetProgress(b).over).length;
  // Budgets are grouped by their OWN period, never by the current month.
  const periods = [...new Set(budgets.map((b) => b.periodLabel))];
  const periodTitle = periods.length === 1 ? ` — ${periods[0]}` : "";
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Budget"
        description="Plan your month. Stay in control."
        actions={<Button size="sm" onClick={() => openDialog("budget")}><Plus className="mr-1 h-4 w-4" /> Set budget</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Monthly budget" value={formatINR(totalBudget)} icon={PieChart} />
        <StatCard
          label="Spent so far"
          value={formatINR(totalSpent)}
          delta={`${percentOf(totalSpent, totalBudget)}% of budget used`}
          tone={totalSpent > totalBudget ? "negative" : "neutral"}
          icon={PieChart}
        />
        <StatCard label="Overspent categories" value={String(overspent)} icon={AlertTriangle} tone={overspent ? "negative" : "positive"} />
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Category budgets{periodTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {budgets.length === 0 && (
            <p className="text-sm text-muted-foreground">No budgets yet. Set one to start tracking.</p>
          )}
          {budgets.map((b) => {
            const { pct, over } = budgetProgress(b);
            return (
              <div key={b.id}>
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">
                    {b.name}
                    {periods.length > 1 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{b.periodLabel}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {over && <Badge variant="destructive" className="text-[10px]">Over budget</Badge>}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditDialog({ kind: "budget", entity: b })}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeBudget(b.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-xs text-muted-foreground">
                  <span className="tabular-nums">{formatINR(b.spent)} / {formatINR(b.budget)}</span>
                  <span className={cn(over && "text-destructive")}>{pct}%</span>
                </div>
                <Progress value={pct} className={cn("mt-2", over && "[&>div]:bg-destructive")} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}