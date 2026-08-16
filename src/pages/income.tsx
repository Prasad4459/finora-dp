import { Plus, ArrowDownCircle, TrendingUp, Calendar, RotateCcw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LedgerSection, type LedgerRow } from "@/components/finance/transactions/ledger-section";
import { formatINR, formatINRCompact } from "@/lib/format";
import { useFinance } from "@/store/finance-store";
import { useLedger } from "@/hooks/use-ledger";
import { addMonths, monthShortLabel, todayISO } from "@/lib/date-in";

const TREND_MONTHS = 6;

export function Income() {
  const { openDialog, openEditDialog, removeIncome, totals, summary } = useFinance();
  // Paginated ledger lives in its own hook so pages without a ledger never load it.
  const ledger = useLedger();
  const { incomes } = ledger;
  // All totals below come from server-side aggregates, not the loaded page.
  const monthTotal = totals.monthIncome;
  const previous = summary.metricsFor(addMonths(summary.current, -1)).grossIncome;
  const ytdMetrics = summary.ytd();
  const ytd = ytdMetrics.grossIncome;
  const avg = Math.round(ytd / Math.max(1, summary.current.month));
  const today = todayISO();
  // Refunds are inflows but NOT income: filter on the ledger type, never on a
  // category name.
  const todayTotal = incomes
    .filter((i) => i.date === today && i.txType !== "refund")
    .reduce((s, i) => s + i.amount, 0);
  const trend = summary.series(TREND_MONTHS).map(({ ref, metrics }) => ({
    month: monthShortLabel(ref),
    value: metrics.grossIncome,
  }));
  const rows: LedgerRow[] = incomes.map((i) => ({
    id: i.id,
    date: i.date,
    title: i.source,
    category: i.category,
    account: i.account,
    amount: i.amount,
    recurring: i.recurring,
    txType: i.txType ?? "income",
  }));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Income"
        description="Track every rupee that comes in."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openDialog("refund")}>
              <RotateCcw className="mr-1 h-4 w-4" /> Record refund
            </Button>
            <Button size="sm" onClick={() => openDialog("income")}>
              <Plus className="mr-1 h-4 w-4" /> Add income
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={formatINR(todayTotal)} icon={Calendar} />
        <StatCard label="This month" value={formatINR(monthTotal)} delta={`Last month ${formatINR(previous)}`} tone="positive" icon={ArrowDownCircle} />
        <StatCard label="Year to date" value={formatINR(ytd)} tone="positive" icon={ArrowDownCircle} />
        <StatCard label="Avg / month" value={formatINR(avg)} delta={`Across ${summary.current.month} months`} icon={TrendingUp} />
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

      <LedgerSection
        title="All inflows"
        rows={rows}
        direction="in"
        isLoading={ledger.isLoading}
        isError={ledger.isError}
        onRetry={ledger.refetch}
        hasMore={ledger.hasMore}
        isLoadingMore={ledger.isLoadingMore}
        loadMore={ledger.loadMore}
        emptyMessage="No income recorded yet. Add your salary or a payout to get started."
        emptyActionLabel="Add income"
        onEmptyAction={() => openDialog("income")}
        onEdit={(row) => {
          const entity = incomes.find((i) => i.id === row.id);
          if (entity) openEditDialog({ kind: "income", entity });
        }}
        onDelete={(id) => removeIncome(id)}
      />
    </div>
  );
}
