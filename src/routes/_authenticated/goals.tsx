import { createFileRoute } from "@tanstack/react-router";
import { Plus, Target, Plane, Home, GraduationCap, Car, PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDateIN } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goals — MoneyOS" }] }),
  component: Goals,
});

const goals = [
  { id: 1, name: "Emergency Fund", icon: PiggyBank, target: 600000, current: 425000, date: "31/03/2027" },
  { id: 2, name: "Europe Trip", icon: Plane, target: 350000, current: 128000, date: "15/12/2026" },
  { id: 3, name: "Home Down Payment", icon: Home, target: 2500000, current: 850000, date: "01/06/2028" },
  { id: 4, name: "New Car (Creta)", icon: Car, target: 1500000, current: 420000, date: "20/09/2027" },
  { id: 5, name: "MBA Fund", icon: GraduationCap, target: 1800000, current: 260000, date: "01/07/2028" },
];

function Goals() {
  const target = goals.reduce((s, g) => s + g.target, 0);
  const current = goals.reduce((s, g) => s + g.current, 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Goals"
        description="Save with intent — one milestone at a time."
        actions={<Button size="sm"><Plus className="mr-1 h-4 w-4" /> New goal</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active goals" value={String(goals.length)} icon={Target} />
        <StatCard label="Total saved" value={formatINR(current)} icon={PiggyBank} tone="positive" />
        <StatCard label="Total target" value={formatINR(target)} icon={Target} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const pct = Math.round((g.current / g.target) * 100);
          const Icon = g.icon;
          return (
            <Card key={g.id} className="border-border/70">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{g.name}</div>
                      <Badge variant="secondary" className="text-[10px]">By {formatDateIN(g.date.split("/").reverse().join("-"))}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatINR(g.current)} of {formatINR(g.target)}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={pct} />
                  <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{pct}% complete</span>
                    <span>{formatINR(g.target - g.current)} to go</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}