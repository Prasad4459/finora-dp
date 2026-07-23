import { createFileRoute } from "@tanstack/react-router";
import { Plus, Landmark, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDateIN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "Assets — MoneyOS" }] }),
  component: Assets,
});

function Assets() {
  const { assets, openDialog, removeAsset } = useFinance();
  const totalCur = assets.reduce((s, a) => s + a.current, 0);
  const totalPur = assets.reduce((s, a) => s + a.purchase, 0);
  const gain = totalCur - totalPur;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Assets"
        description="Everything you own that holds value."
        actions={
          <Button size="sm" onClick={() => openDialog("asset")}>
            <Plus className="mr-1 h-4 w-4" /> Add asset
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total assets" value={formatINR(totalCur)} icon={Landmark} tone="positive" />
        <StatCard label="Invested" value={formatINR(totalPur)} icon={Landmark} />
        <StatCard
          label="Unrealized gain"
          value={formatINR(gain)}
          delta={`${((gain / totalPur) * 100).toFixed(1)}% appreciation`}
          icon={gain >= 0 ? TrendingUp : TrendingDown}
          tone={gain >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader><CardTitle className="text-base font-semibold">Portfolio</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Acquired</TableHead>
                <TableHead className="text-right">Purchase</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => {
                const pl = a.current - a.purchase;
                const pct = (pl / a.purchase) * 100;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{a.type}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{formatDateIN(a.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(a.purchase)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatINR(a.current)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums font-semibold", pl >= 0 ? "text-primary" : "text-destructive")}>
                      {pl >= 0 ? "+" : ""}{formatINR(pl)} <span className="text-xs opacity-70">({pct.toFixed(1)}%)</span>
                    </TableCell>
                    <TableCell><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeAsset(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
