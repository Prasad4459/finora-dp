import { createFileRoute } from "@tanstack/react-router";
import { Plus, Landmark, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDateIN } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "Assets — MoneyOS" }] }),
  component: Assets,
});

const assets = [
  { id: 1, name: "SBI Savings", type: "Bank", purchase: 200000, current: 200000, date: "2022-04-01" },
  { id: 2, name: "HDFC 1-Year FD", type: "FD", purchase: 300000, current: 321000, date: "2025-07-10" },
  { id: 3, name: "Sovereign Gold Bond", type: "Gold", purchase: 150000, current: 187000, date: "2023-09-15" },
  { id: 4, name: "Nifty 50 Index Fund", type: "Mutual Funds", purchase: 400000, current: 512000, date: "2022-06-20" },
  { id: 5, name: "TCS Shares", type: "Stocks", purchase: 120000, current: 148000, date: "2024-02-11" },
  { id: 6, name: "PPF Account", type: "PPF", purchase: 250000, current: 278000, date: "2020-04-01" },
  { id: 7, name: "EPF", type: "EPF", purchase: 320000, current: 356000, date: "2021-05-01" },
  { id: 8, name: "NPS Tier-1", type: "NPS", purchase: 80000, current: 92000, date: "2023-04-01" },
  { id: 9, name: "2BHK — Whitefield", type: "Property", purchase: 6500000, current: 7800000, date: "2019-11-20" },
  { id: 10, name: "Honda City", type: "Vehicle", purchase: 1200000, current: 780000, date: "2021-01-15" },
  { id: 11, name: "Bitcoin", type: "Crypto", purchase: 50000, current: 72000, date: "2024-08-01" },
];

function Assets() {
  const totalCur = assets.reduce((s, a) => s + a.current, 0);
  const totalPur = assets.reduce((s, a) => s + a.purchase, 0);
  const gain = totalCur - totalPur;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Assets"
        description="Everything you own that holds value."
        actions={
          <Button size="sm">
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
