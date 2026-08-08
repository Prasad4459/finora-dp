import { Plus, ArrowUpCircle, TrendingDown, Calendar, Trash2, Pencil } from "lucide-react";
import { Bar, BarChart, Cell, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatINRCompact, formatDateIN } from "@/lib/format";
import { useFinance } from "@/store/finance-store";
import { useLedger } from "@/hooks/use-ledger";
import { addMonths, monthShortLabel, todayISO } from "@/lib/date-in";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];
const TREND_MONTHS = 6;

export function Expenses() {
  const { openDialog, openEditDialog, removeExpense, totals, summary } = useFinance();
  // Paginated ledger lives in its own hook so pages without a ledger never load it.
  const { expenses, hasMore: hasMoreTransactions, isLoadingMore: isLoadingMoreTransactions, loadMore: loadMoreTransactions } = useLedger();
  // Server-side aggregates only — the table below is paginated and can never
  // be used to compute a total.
  const monthTotal = totals.monthExpenses;
  const previous = summary.metricsFor(addMonths(summary.current, -1)).consumptionExpense;
  const ytd = summary.ytd().consumptionExpense;
  const avg = Math.round(ytd / Math.max(1, summary.current.month));
  const today = todayISO();
  const todayTotal = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);
  const trend = summary.series(TREND_MONTHS).map(({ ref, metrics }) => ({
    month: monthShortLabel(ref),
    value: metrics.consumptionExpense,
  }));
  const catBreakdown = summary.categorySpend(summary.current).slice(0, 6).map((c, i) => ({
    name: c.name,
    value: c.net,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Expenses"
        description="See where your money goes, honestly."
        actions={
          <Button size="sm" onClick={() => openDialog("expense")}>
            <Plus className="mr-1 h-4 w-4" /> Add expense
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={formatINR(todayTotal)} icon={Calendar} />
        <StatCard label="This month" value={formatINR(monthTotal)} delta={`Last month ${formatINR(previous)}`} tone="negative" icon={ArrowUpCircle} />
        <StatCard label="Year to date" value={formatINR(ytd)} tone="negative" icon={ArrowUpCircle} />
        <StatCard label="Avg / month" value={formatINR(avg)} delta={`Across ${summary.current.month} months`} icon={TrendingDown} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader><CardTitle className="text-base font-semibold">Monthly trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatINRCompact} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader><CardTitle className="text-base font-semibold">By category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {catBreakdown.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No spending this month yet.</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catBreakdown} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
                    {catBreakdown.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader><CardTitle className="text-base font-semibold">All expenses</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{formatDateIN(e.date)}</TableCell>
                  <TableCell className="font-medium">{e.merchant}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{e.category}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{e.account}</TableCell>
                  <TableCell className="text-muted-foreground">{e.method}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">-{formatINR(e.amount)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog({ kind: "expense", entity: e })}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeExpense(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasMoreTransactions && (
            <div className="flex justify-center p-3">
              <Button variant="ghost" size="sm" disabled={isLoadingMoreTransactions} onClick={loadMoreTransactions}>
                {isLoadingMoreTransactions ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
