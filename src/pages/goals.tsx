import { Plus, Target, PiggyBank, Trash2, Pencil, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDateIN } from "@/lib/format";
import { useFinance } from "@/store/finance-store";


export function Goals() {
  const { goals, openDialog, openEditDialog, removeGoal } = useFinance();
  const target = goals.reduce((s, g) => s + g.target, 0);
  const current = goals.reduce((s, g) => s + g.current, 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Goals"
        description="Save with intent — one milestone at a time."
        actions={<Button size="sm" onClick={() => openDialog("goal")}><Plus className="mr-1 h-4 w-4" /> New goal</Button>}
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
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">By {formatDateIN(g.date)}</Badge>
                        <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px]" title="Move money into this goal" onClick={() => openEditDialog({ kind: "contribution", entity: g })}><IndianRupee className="h-3 w-3" /> Contribute</Button><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditDialog({ kind: "goal", entity: g })}><Pencil className="h-3 w-3" /></Button><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeGoal(g.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
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