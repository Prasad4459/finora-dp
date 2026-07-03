import { createFileRoute } from "@tanstack/react-router";
import { Plus, PieChart, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({ meta: [{ title: "Budget — MoneyOS" }] }),
  component: Budget,
});

const budgets = [
  { name: "Groceries", spent: 8500, budget: 10000 },
  { name: "Rent", spent: 18000, budget: 18000 },
  { name: "Fuel", spent: 4200, budget: 4000 },
  { name: "Food & Dining", spent: 5600, budget: 5000 },
  { name: "Entertainment", spent: 2800, budget: 3500 },
  { name: "Shopping", spent: 3200, budget: 5000 },
  { name: "Utilities", spent: 3800, budget: 4500 },
  { name: "Transport", spent: 1900, budget: 3000 },
];

function Budget() {
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const overspent = budgets.filter((b) => b.spent > b.budget).length;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Budget"
        description="Plan your month. Stay in control."
        actions={<Button size="sm"><Plus className="mr-1 h-4 w-4" /> Set budget</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Monthly budget" value={formatINR(totalBudget)} icon={PieChart} />
        <StatCard
          label="Spent so far"
          value={formatINR(totalSpent)}
          delta={`${Math.round((totalSpent / totalBudget) * 100)}% of budget used`}
          tone={totalSpent > totalBudget ? "negative" : "neutral"}
          icon={PieChart}
        />
        <StatCard label="Overspent categories" value={String(overspent)} icon={AlertTriangle} tone={overspent ? "negative" : "positive"} />
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Category budgets — July 2026</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {budgets.map((b) => {
            const pct = Math.min(Math.round((b.spent / b.budget) * 100), 130);
            const over = b.spent > b.budget;
            return (
              <div key={b.name}>
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{b.name}</div>
                  {over && <Badge variant="destructive" className="text-[10px]">Over budget</Badge>}
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