import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Plus,
  Landmark,
  CreditCard,
  Home,
  Zap,
  Wifi,
  ShoppingBag,
  Utensils,
  Car,
  Film,
  Heart,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  PiggyBank,
  Sparkles,
  Receipt,
  ArrowLeftRight,
  Banknote,
  RotateCcw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFinanceGreeting } from "@/components/finance/use-greeting";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatINR, formatINRExact, formatINRCompact } from "@/lib/format";
import { useFinance } from "@/store/finance-store";
import { computeHealthScore, netWorthChange, percentOf } from "@/services/finance";
import { monthShortLabel } from "@/lib/date-in";
import { TRANSACTION_LABEL } from "@/lib/transaction-view";
import { formatDateIN } from "@/lib/format";


const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];
const TREND_MONTHS = 7;

const currency = formatINR;
const currencyExact = formatINRExact;

export function Dashboard() {
  return <DashboardInner />;
}

function WelcomeHeader({ onAdd }: { onAdd: () => void }) {
  const greeting = useFinanceGreeting();
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
      const label = meta.full_name || meta.name || user.email?.split("@")[0] || "";
      setName(label ? label.charAt(0).toUpperCase() + label.slice(1) : "");
    });
  }, []);

  return (
    <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting}
          {name ? `, ${name}` : ""} <span className="align-middle">👋</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your Financial Life. <span className="font-medium text-primary">Organized.</span>
        </p>
      </div>
      <Button size="sm" className="shrink-0" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add transaction
      </Button>
    </div>
  );
}

function DashboardInner() {
  const {
    openDialog, accounts, incomes, expenses, liabilities, bills: allBills, goals: allGoals,
    totals, transactions: ledger, summary,
  } = useFinance();
  // All financial maths lives in the pure services layer (via the store).
  const { totalBalance, totalInvestments, totalDebt, netWorth, monthIncome, monthExpenses, savingsRate } = totals;
  const upcomingTotal = allBills.reduce((s, b) => s + b.amount, 0);
  const health = computeHealthScore(totals);
  const healthScore = health.score;
  const recent = ledger.slice(0, 6);

  // ---- Server-aggregated series (never derived from the paginated list) ----
  const series = summary.series(TREND_MONTHS);
  const cashFlowData = series.map(({ ref, metrics }) => ({
    month: monthShortLabel(ref),
    income: metrics.grossIncome,
    expense: metrics.consumptionExpense,
  }));

  // Net worth is only known for today, so the curve is reconstructed backwards
  // by removing each month's net-worth change.
  const netWorthData = (() => {
    const points: Array<{ month: string; value: number }> = [];
    let running = netWorth;
    for (let i = series.length - 1; i >= 0; i--) {
      points.unshift({ month: monthShortLabel(series[i].ref), value: Math.round(running) });
      running -= netWorthChange(series[i].metrics);
    }
    return points;
  })();
  const ytd = summary.ytd();
  const ytdGrowth = percentOf(netWorthChange(ytd), Math.max(1, netWorth - netWorthChange(ytd)));

  const expenseBreakdown = summary.categorySpend(summary.current).slice(0, 6).map((c, i) => ({
    name: c.name,
    value: c.net,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const recentIncome = incomes.slice(0, 4);
  const topGoals = allGoals.slice(0, 3);
  const upcomingBills = allBills.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl">
      <WelcomeHeader onAdd={() => openDialog("expense")} />

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total balance" value={currency(totalBalance)} delta={`Across ${accounts.length} accounts`} icon={Wallet} />
        <StatCard label="Net worth" value={currency(netWorth)} delta="Assets − Liabilities" icon={TrendingUp} tone="positive" />
        <StatCard label="Monthly income" value={currency(monthIncome)} delta={`${incomes.length} entries`} icon={ArrowDownCircle} tone="positive" />
        <StatCard label="Monthly expenses" value={currency(monthExpenses)} delta={`${expenses.length} entries`} icon={ArrowUpCircle} tone="negative" />
        <StatCard label="Savings rate" value={`${savingsRate}%`} delta={savingsRate >= 40 ? "Healthy — above 40%" : "Aim for 40%+"} icon={PiggyBank} tone={savingsRate >= 40 ? "positive" : "neutral"} />
        <StatCard label="Total investments" value={currency(totalInvestments)} delta="MF, Stocks, PPF, EPF" icon={TrendingUp} />
        <StatCard label="Total debt" value={currency(totalDebt)} delta={`${liabilities.length} liabilities`} icon={CreditCard} tone="negative" />
        <StatCard label="Upcoming bills" value={currency(upcomingTotal)} delta={`${allBills.length} bills`} icon={Receipt} />
      </div>

      {/* Quick actions */}
      <Card className="mt-6 border-border/70">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">Quick actions</div>
              <div className="text-xs text-muted-foreground">Log something in seconds</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => openDialog("income")}>
              <ArrowDownCircle className="mr-1.5 h-4 w-4 text-primary" />
              Add income
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("expense")}>
              <ArrowUpCircle className="mr-1.5 h-4 w-4 text-destructive" />
              Add expense
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("asset")}>
              <Landmark className="mr-1.5 h-4 w-4" />
              Add asset
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("liability")}>
              <CreditCard className="mr-1.5 h-4 w-4" />
              Add liability
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("transfer")}>
              <ArrowLeftRight className="mr-1.5 h-4 w-4" />
              Transfer
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("investment")}>
              <TrendingUp className="mr-1.5 h-4 w-4" />
              Invest
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("emi")}>
              <Banknote className="mr-1.5 h-4 w-4" />
              Pay EMI
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("dividend")}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Dividend
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("refund")}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Refund
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openDialog("goal")}>
              <Target className="mr-1.5 h-4 w-4" />
              Create goal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Income vs Expense</CardTitle>
              <p className="text-sm text-muted-foreground">Last 7 months</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <LegendDot color="var(--chart-1)" label="Income" />
              <LegendDot color="var(--chart-2)" label="Expense" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatINRCompact} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                  <Bar dataKey="income" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Expense Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {expenseBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={currencyExact} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {expenseBreakdown.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </div>
                  <span className="font-medium tabular-nums">{currency(c.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net worth chart */}
      <Card className="mt-4 border-border/70">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Net Worth Growth</CardTitle>
            <p className="text-sm text-muted-foreground">Trailing 7 months</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums">{currency(1875000)}</div>
            <div className="text-xs text-primary">+38.4% YTD</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatINRCompact} />
                <Tooltip content={<ChartTooltip valueFormatter={currencyExact} />} />
                <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill="url(#nw)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Goals + Financial Health + Recent income */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Goals progress</CardTitle>
              <p className="text-sm text-muted-foreground">Top 3 active goals</p>
            </div>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((g) => {
              const pct = Math.round((g.saved / g.target) * 100);
              return (
                <div key={g.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground">ETA {g.eta}</div>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                    <span>{currency(g.saved)} of {currency(g.target)}</span>
                    <span className="font-medium text-foreground">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Financial health</CardTitle>
              <p className="text-sm text-muted-foreground">Based on savings, debt & runway</p>
            </div>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-5xl font-semibold tracking-tight">{healthScore}</div>
              <div className="pb-1 text-sm text-muted-foreground">/ 100</div>
              <Badge variant="secondary" className="ml-auto">Good</Badge>
            </div>
            <Progress value={healthScore} className="mt-4 h-2" />
            <ul className="mt-4 space-y-2 text-xs">
              <li className="flex items-center justify-between"><span className="text-muted-foreground">Savings rate</span><span className="font-medium text-primary">Excellent</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">Debt-to-income</span><span className="font-medium">Healthy</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">Emergency runway</span><span className="font-medium">7.6 months</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">Investment diversity</span><span className="font-medium">Balanced</span></li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Recent income</CardTitle>
              <p className="text-sm text-muted-foreground">Latest credits</p>
            </div>
            <ArrowDownCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentIncome.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <ArrowDownCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.date}</div>
                  </div>
                  <div className="text-sm font-semibold text-primary tabular-nums">+{currency(i.amount)}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Top expense categories */}
      <Card className="mt-4 border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Top expense categories</CardTitle>
          <p className="text-sm text-muted-foreground">Where most of your money went this month</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenseBreakdown.slice(0, 5).map((c) => {
            const total = expenseBreakdown.reduce((s, x) => s + x.value, 0);
            const pct = Math.round((c.value / total) * 100);
            return (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    <span className="font-medium">{c.name}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {currency(c.value)} <span className="text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Transactions + Bills */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              <p className="text-sm text-muted-foreground">Latest activity across your accounts</p>
            </div>
            <Button variant="ghost" size="sm">View all</Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recent.length === 0 && (
                <li className="px-5 py-6 text-sm text-muted-foreground">No transactions yet.</li>
              )}
              {recent.map((t) => {
                const positive = t.direction === "in";
                const neutral = t.direction === "neutral";
                const Icon = positive ? ArrowDownCircle : neutral ? ArrowLeftRight : ShoppingBag;
                return (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        positive ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {TRANSACTION_LABEL[t.type]} • {t.category} • {t.account}
                      </div>
                    </div>
                    <div className="hidden text-xs text-muted-foreground sm:block">{formatDateIN(t.date)}</div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-sm font-semibold tabular-nums",
                        positive ? "text-primary" : "text-foreground",
                      )}
                    >
                      {positive ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      {positive ? "+" : neutral ? "" : "-"}
                      {currencyExact(Math.abs(t.amount))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Upcoming Bills</CardTitle>
              <p className="text-sm text-muted-foreground">Due in the next 2 weeks</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {upcomingBills.map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{b.name}</div>
                      <Badge variant="secondary" className="mt-0.5 h-5 px-1.5 text-[10px] font-normal">
                        Due {b.due}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{currencyExact(b.amount)}</div>
                  </li>
                );
              })}
            </ul>
            <div className="p-3">
              <Button variant="outline" size="sm" className="w-full" onClick={() => openDialog("bill")}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add bill
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = currency,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; payload?: { color?: string } }>;
  label?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <div className="mb-1 font-medium text-popover-foreground">{label}</div>}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: p.color ?? p.payload?.color ?? "var(--chart-1)" }}
            />
            <span className="capitalize text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-medium tabular-nums text-popover-foreground">
              {valueFormatter(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
