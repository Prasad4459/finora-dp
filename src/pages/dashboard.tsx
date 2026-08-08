// Dashboard = presentation only.
//
// Every figure comes from the finance engine (src/services/finance.ts) or the
// server-side aggregates; chart shaping lives in src/services/dashboard.ts.
// Each widget owns its own query state so a slow or failing source can never
// blank the page, and a failed query is never rendered as ₹0.
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Plus,
  Landmark,
  CreditCard,
  Zap,
  ShoppingBag,
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
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFinanceGreeting } from "@/components/finance/use-greeting";
import { StatCard } from "@/components/finance/stat-card";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatINR, formatINRExact, formatINRCompact, formatDateIN } from "@/lib/format";
import { useFinance } from "@/store/finance-store";
import { computeHealthScore, netWorthChange, percentOf } from "@/services/finance";
import {
  breakdownTotal,
  buildBreakdown,
  buildCashFlowSeries,
  buildNetWorthSeries,
} from "@/services/dashboard";
import { TRANSACTION_LABEL } from "@/lib/transaction-view";
import {
  useBalanceSheet,
  useBillsWidget,
  useGoalsWidget,
  useRecentActivity,
  useSummaryWidget,
} from "@/hooks/use-dashboard-data";

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

const authRoute = getRouteApi("/_authenticated");

export function Dashboard() {
  return <DashboardInner />;
}

function WelcomeHeader({ onAdd }: { onAdd: () => void }) {
  const greeting = useFinanceGreeting();
  // The authenticated session is already resolved by the /_authenticated route
  // guard — no extra auth request, and therefore no username flash.
  const { user } = authRoute.useRouteContext();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const raw = meta.full_name || meta.name || user?.email?.split("@")[0] || "";
  const name = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";

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
  const { openDialog } = useFinance();
  return (
    <div className="mx-auto max-w-7xl">
      <WelcomeHeader onAdd={() => openDialog("expense")} />
      <StatsRow />
      <QuickActions />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <IncomeVsExpenseCard />
        <ExpenseBreakdownCard />
      </div>
      <NetWorthCard />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <GoalsCard />
        <HealthCard />
        <RecentIncomeCard />
      </div>
      <TopCategoriesCard />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <RecentTransactionsCard />
        <UpcomingBillsCard />
      </div>
    </div>
  );
}

/* --------------------------------- widgets -------------------------------- */

/** Maps a widget's status onto the StatCard state, never showing a false ₹0. */
const cardState = (s: { isLoading: boolean; isError: boolean }) =>
  s.isError ? ("error" as const) : s.isLoading ? ("loading" as const) : ("ready" as const);

function StatsRow() {
  const sheet = useBalanceSheet();
  const bills = useBillsWidget();
  const t = sheet.totals;
  const state = cardState(sheet);
  const billState = cardState(bills);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total balance" value={currency(t.totalBalance)} delta={`Across ${sheet.accountCount} accounts`} icon={Wallet} state={state} onRetry={sheet.refetch} />
      <StatCard label="Net worth" value={currency(t.netWorth)} delta="Assets − Liabilities" icon={TrendingUp} tone="positive" state={state} onRetry={sheet.refetch} />
      <StatCard label="Monthly income" value={currency(t.monthIncome)} delta="Salary, dividends & other credits" icon={ArrowDownCircle} tone="positive" state={state} onRetry={sheet.refetch} />
      <StatCard label="Monthly expenses" value={currency(t.monthExpenses)} delta="Spending + EMI interest − refunds" icon={ArrowUpCircle} tone="negative" state={state} onRetry={sheet.refetch} />
      <StatCard label="Savings rate" value={`${t.savingsRate}%`} delta={t.savingsRate >= 40 ? "Healthy — above 40%" : "Aim for 40%+"} icon={PiggyBank} tone={t.savingsRate >= 40 ? "positive" : "neutral"} state={state} onRetry={sheet.refetch} />
      <StatCard label="Total investments" value={currency(t.totalInvestments)} delta="MF, Stocks, PPF, EPF" icon={TrendingUp} state={state} onRetry={sheet.refetch} />
      <StatCard label="Total debt" value={currency(t.totalDebt)} delta={`${sheet.liabilityCount} liabilities`} icon={CreditCard} tone="negative" state={state} onRetry={sheet.refetch} />
      <StatCard label="Upcoming bills" value={currency(bills.total)} delta={`${bills.count} bills`} icon={Receipt} state={billState} onRetry={bills.refetch} />
    </div>
  );
}

function QuickActions() {
  const { openDialog } = useFinance();
  return (
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
  );
}

function IncomeVsExpenseCard() {
  const summary = useSummaryWidget();
  const data = useMemo(() => buildCashFlowSeries(summary.series(TREND_MONTHS)), [summary.categoryRows, summary.isLoading, summary.current.year, summary.current.month]);
  const hasActivity = data.some((d) => d.income > 0 || d.expense > 0);

  return (
    <Card className="border-border/70 lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Income vs Expense</CardTitle>
          <p className="text-sm text-muted-foreground">Last {TREND_MONTHS} months</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <LegendDot color="var(--chart-1)" label="Income" />
          <LegendDot color="var(--chart-2)" label="Expense" />
        </div>
      </CardHeader>
      <CardContent>
        {summary.isError ? (
          <WidgetError message="Couldn't load your monthly totals." onRetry={summary.refetch} />
        ) : summary.isLoading ? (
          <WidgetSkeleton lines={6} className="h-[260px]" />
        ) : !hasActivity ? (
          <WidgetEmpty message="No income or expenses recorded yet." />
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatINRCompact} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                <Bar dataKey="income" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Shared category-spend shaping for the donut and the "top categories" list. */
function useExpenseBreakdown() {
  const summary = useSummaryWidget();
  const slices = useMemo(
    () => buildBreakdown(summary.categorySpend(summary.current), CHART_COLORS),
    [summary.categoryRows, summary.isLoading, summary.current.year, summary.current.month],
  );
  return { summary, slices };
}

function ExpenseBreakdownCard() {
  const { summary, slices } = useExpenseBreakdown();
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Expense Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">This month</p>
      </CardHeader>
      <CardContent>
        {summary.isError ? (
          <WidgetError message="Couldn't load category spending." onRetry={summary.refetch} />
        ) : summary.isLoading ? (
          <WidgetSkeleton lines={5} className="h-[200px]" />
        ) : slices.length === 0 ? (
          <WidgetEmpty message="No spending recorded this month." />
        ) : (
          <>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {slices.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={currencyExact} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {slices.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </div>
                  <span className="font-medium tabular-nums">{currency(c.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TopCategoriesCard() {
  const { summary, slices } = useExpenseBreakdown();
  // Computed once, not per rendered row.
  const total = useMemo(() => breakdownTotal(slices), [slices]);

  return (
    <Card className="mt-4 border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Top expense categories</CardTitle>
        <p className="text-sm text-muted-foreground">Where most of your money went this month</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.isError ? (
          <WidgetError message="Couldn't load category spending." onRetry={summary.refetch} />
        ) : summary.isLoading ? (
          <WidgetSkeleton lines={4} />
        ) : slices.length === 0 ? (
          <WidgetEmpty message="No spending recorded this month." className="py-0" />
        ) : (
          slices.slice(0, 5).map((c) => {
            const pct = percentOf(c.value, total);
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
          })
        )}
      </CardContent>
    </Card>
  );
}

function NetWorthCard() {
  const summary = useSummaryWidget();
  const sheet = useBalanceSheet();
  const netWorth = sheet.totals.netWorth;

  const series = useMemo(() => summary.series(TREND_MONTHS), [summary.categoryRows, summary.isLoading, summary.current.year, summary.current.month]);
  const data = useMemo(() => buildNetWorthSeries(series, netWorth), [series, netWorth]);
  const ytdGrowth = useMemo(() => {
    const ytd = summary.ytd();
    return percentOf(netWorthChange(ytd), Math.max(1, netWorth - netWorthChange(ytd)));
  }, [series, netWorth]);

  const failed = sheet.isError || summary.isError;
  const busy = sheet.isLoading || summary.isLoading;
  const hasHistory = data.some((p) => p.value !== 0);

  return (
    <Card className="mt-4 border-border/70">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Net Worth Growth</CardTitle>
          <p className="text-sm text-muted-foreground">Trailing {TREND_MONTHS} months</p>
        </div>
        {!failed && !busy && (
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums">{currency(netWorth)}</div>
            <div className="text-xs text-primary">{ytdGrowth >= 0 ? "+" : ""}{ytdGrowth}% YTD</div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {failed ? (
          <WidgetError message="Couldn't load your net worth history." onRetry={() => { sheet.refetch(); summary.refetch(); }} />
        ) : busy ? (
          <WidgetSkeleton lines={5} className="h-[220px]" />
        ) : !hasHistory ? (
          <WidgetEmpty message="Add an account or a transaction to start tracking net worth." />
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
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
        )}
      </CardContent>
    </Card>
  );
}

function GoalsCard() {
  const { goals, isLoading, isError, refetch } = useGoalsWidget();
  const top = goals.slice(0, 3);
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Goals progress</CardTitle>
          <p className="text-sm text-muted-foreground">Top 3 active goals</p>
        </div>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <WidgetError message="Couldn't load your goals." onRetry={refetch} />
        ) : isLoading ? (
          <WidgetSkeleton lines={4} />
        ) : top.length === 0 ? (
          <p className="text-sm text-muted-foreground">No goals yet.</p>
        ) : (
          top.map((g) => {
            const pct = percentOf(g.current, g.target);
            return (
              <div key={g.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">By {formatDateIN(g.date)}</div>
                </div>
                <Progress value={Math.min(100, pct)} className="h-2" />
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{currency(g.current)} of {currency(g.target)}</span>
                  <span className="font-medium text-foreground">{pct}%</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function HealthCard() {
  const sheet = useBalanceSheet();
  // Score is a pure engine calculation; memoised because it runs on every
  // dashboard render otherwise.
  const health = useMemo(() => computeHealthScore(sheet.totals), [sheet.totals]);
  const t = sheet.totals;

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Financial health</CardTitle>
          <p className="text-sm text-muted-foreground">Based on savings, debt & runway</p>
        </div>
        <Sparkles className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {sheet.isError ? (
          <WidgetError message="Couldn't calculate your health score." onRetry={sheet.refetch} />
        ) : sheet.isLoading ? (
          <WidgetSkeleton lines={6} />
        ) : (
          <>
            <div className="flex items-end gap-2">
              <div className="text-5xl font-semibold tracking-tight">{health.score}</div>
              <div className="pb-1 text-sm text-muted-foreground">/ 100</div>
              <Badge variant="secondary" className="ml-auto">{health.label}</Badge>
            </div>
            <Progress value={health.score} className="mt-4 h-2" />
            <ul className="mt-4 space-y-2 text-xs">
              <li className="flex items-center justify-between"><span className="text-muted-foreground">Savings rate</span><span className="font-medium text-primary">{t.savingsRate}%</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">Monthly cash outflow</span><span className="font-medium">{currency(t.monthCashOutflow)}</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">Emergency runway</span><span className="font-medium">{health.runwayMonths} months</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">Invested this month</span><span className="font-medium">{currency(t.monthInvested)}</span></li>
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RecentIncomeCard() {
  const { incomes, isLoading, isError, refetch } = useRecentActivity();
  const rows = incomes.slice(0, 4);
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Recent income</CardTitle>
          <p className="text-sm text-muted-foreground">Latest credits</p>
        </div>
        <ArrowDownCircle className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="p-0">
        {isError ? (
          <div className="px-5">
            <WidgetError message="Couldn't load recent income." onRetry={refetch} />
          </div>
        ) : isLoading ? (
          <div className="px-5 py-4">
            <WidgetSkeleton lines={3} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">No income recorded yet.</li>
            )}
            {rows.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ArrowDownCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{i.source}</div>
                  <div className="text-xs text-muted-foreground">{formatDateIN(i.date)}</div>
                </div>
                <div className="text-sm font-semibold text-primary tabular-nums">+{currency(i.amount)}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentTransactionsCard() {
  const { transactions, isLoading, isError, refetch } = useRecentActivity();
  const rows = transactions.slice(0, 6);
  return (
    <Card className="border-border/70 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          <p className="text-sm text-muted-foreground">Latest activity across your accounts</p>
        </div>
        <Button variant="ghost" size="sm">View all</Button>
      </CardHeader>
      <CardContent className="p-0">
        {isError ? (
          <div className="px-5">
            <WidgetError message="Couldn't load recent transactions." onRetry={refetch} />
          </div>
        ) : isLoading ? (
          <div className="px-5 py-4">
            <WidgetSkeleton lines={4} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">No transactions yet.</li>
            )}
            {rows.map((t) => {
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
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingBillsCard() {
  const { openDialog } = useFinance();
  const { bills, isLoading, isError, refetch } = useBillsWidget();
  const rows = bills.slice(0, 4);
  return (
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
        {isError ? (
          <div className="px-5">
            <WidgetError message="Couldn't load your bills." onRetry={refetch} />
          </div>
        ) : isLoading ? (
          <div className="px-5 py-4">
            <WidgetSkeleton lines={3} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">No bills scheduled.</li>
            )}
            {rows.map((b) => {
              const Icon = b.icon ?? Receipt;
              return (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <Badge variant="secondary" className="mt-0.5 h-5 px-1.5 text-[10px] font-normal">
                      Due {formatDateIN(b.due)}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{currencyExact(b.amount)}</div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="p-3">
          <Button variant="outline" size="sm" className="w-full" onClick={() => openDialog("bill")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add bill
          </Button>
        </div>
      </CardContent>
    </Card>
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
