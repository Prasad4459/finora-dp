import { createFileRoute } from "@tanstack/react-router";
import { Plus, ArrowDownCircle, TrendingUp, Calendar } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatINRCompact, formatDateIN } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — MoneyOS" }] }),
  component: Income,
});

const incomes = [
  { id: 1, date: "2026-07-01", source: "Infosys Ltd.", category: "Salary", account: "HDFC •• 4021", amount: 85000, recurring: true },
  { id: 2, date: "2026-06-28", source: "Freelance — Acme Co.", category: "Freelancing", account: "ICICI •• 1009", amount: 22000, recurring: false },
  { id: 3, date: "2026-06-20", source: "SBI Savings Interest", category: "Interest", account: "SBI •• 8891", amount: 1240, recurring: true },
  { id: 4, date: "2026-06-15", source: "TCS Dividend", category: "Dividend", account: "Zerodha", amount: 3600, recurring: false },
  { id: 5, date: "2026-06-10", source: "Amazon Cashback", category: "Cashback", account: "HDFC •• 4021", amount: 450, recurring: false },
  { id: 6, date: "2026-06-05", source: "PG rent — Koramangala", category: "Rental Income", account: "Axis •• 3320", amount: 18000, recurring: true },
  { id: 7, date: "2026-06-01", source: "Infosys Ltd.", category: "Salary", account: "HDFC •• 4021", amount: 85000, recurring: true },
];

const trend = [
  { month: "Feb", value: 92000 },
  { month: "Mar", value: 104000 },
  { month: "Apr", value: 108000 },
  { month: "May", value: 96000 },
  { month: "Jun", value: 130290 },
  { month: "Jul", value: 85000 },
];

function Income() {
  const monthTotal = incomes
    .filter((i) => i.date.startsWith("2026-07"))
    .reduce((s, i) => s + i.amount, 0);
  const ytd = incomes.reduce((s, i) => s + i.amount, 0);
  const avg = Math.round(ytd / 6);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Income"
        description="Track every rupee that comes in."
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add income
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={formatINR(0)} icon={Calendar} />
        <StatCard label="This month" value={formatINR(monthTotal)} tone="positive" icon={ArrowDownCircle} />
        <StatCard label="This year" value={formatINR(ytd)} tone="positive" icon={ArrowDownCircle} />
        <StatCard label="Avg / month" value={formatINR(avg)} icon={TrendingUp} />
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Income trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatINRCompact} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Area dataKey="value" type="monotone" stroke="var(--chart-1)" strokeWidth={2} fill="url(#inc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-border/70">
        <CardHeader><CardTitle className="text-base font-semibold">All income</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-muted-foreground">{formatDateIN(i.date)}</TableCell>
                  <TableCell className="font-medium">
                    {i.source}
                    {i.recurring && <Badge variant="secondary" className="ml-2 text-[10px]">Recurring</Badge>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{i.category}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{i.account}</TableCell>
                  <TableCell className="text-right font-semibold text-primary tabular-nums">+{formatINR(i.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
