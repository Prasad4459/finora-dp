// Dashboard = presentation only.
//
// Every figure comes from the finance engine (src/services/finance.ts), the
// bill service (src/services/bills.ts), the brief service
// (src/services/brief.ts) or the server-side aggregates; chart shaping lives in
// src/services/dashboard.ts. Each widget owns its own query state so a slow or
// failing source can never blank the page, and a failed query is never
// rendered as ₹0.
import {
  Wallet,
  ArrowDownCircle,
  TrendingUp,
  Plus,
  Landmark,
  CreditCard,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Sparkles,
  Receipt,
  ArrowLeftRight,
  Banknote,
  RotateCcw,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { MessageSquare, Compass, Info } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFinanceGreeting } from "@/components/finance/use-greeting";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatINR, formatINRExact, formatINRCompact, formatDateIN } from "@/lib/format";
import { useFinance } from "@/store/finance-store";
import { computeHealthScore, netWorthChange, percentOf } from "@/services/finance";
import { URGENCY_LABEL, type BillUrgency } from "@/services/bills";
import { buildInsights, type Insight } from "@/services/brief";
import {
  breakdownTotal,
  buildBreakdown,
  buildCashFlowSeries,
  buildNetWorthSeries,
} from "@/services/dashboard";
import { IST_TIMEZONE } from "@/lib/date-in";
import { TRANSACTION_LABEL } from "@/lib/transaction-view";
import {
  useBalanceSheet,
  useBillsWidget,
  useGoalsWidget,
  useInvestmentsWidget,
  useMonthComparison,
  useOnboardingState,
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

const longDateIN = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: IST_TIMEZONE,
});

/** Maps a widget's status onto the StatCard state, never showing a false ₹0. */
const cardState = (s: { isLoading: boolean; isError: boolean }) =>
  s.isError ? ("error" as const) : s.isLoading ? ("loading" as const) : ("ready" as const);

function useDisplayName() {
  // The authenticated session is already resolved by the /_authenticated route
  // guard — no extra auth request, and therefore no username flash.
  const { user } = authRoute.useRouteContext();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const raw = meta.full_name || meta.name || user?.email?.split("@")[0] || "";
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
}

export function Dashboard() {
  const onboarding = useOnboardingState();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden">
      <DashboardHeader />
      {onboarding.isNewUser ? (
        <GettingStarted />
      ) : (
        <>
          <NetWorthHero />
          <NeedsAttention />
          <DiscoveryCards />
          <CashFlowCard />
          <div className="grid gap-4 lg:grid-cols-3">
            <SpendingCard />
            <NetWorthCard />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <RecentTransactionsCard />
            <GoalsCard />
          </div>
          <HealthCard />
        </>
      )}
    </div>
  );
}

/* --------------------------------- header -------------------------------- */

function DashboardHeader() {
  const greeting = useFinanceGreeting();
  const name = useDisplayName();
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{longDateIN.format(new Date())}</span>
        </p>
        <h1 className="mt-1 break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
      </div>
      <QuickActions />
    </header>
  );
}

/* ------------------------------ net-worth hero ---------------------------- */

function NetWorthHero() {
  const sheet = useBalanceSheet();
  const { month } = useMonthComparison();
  const investments = useInvestmentsWidget();
  const { openDialog } = useFinance();

  const t = sheet.totals;
  const nwChange = netWorthChange(month);
  const p = investments.portfolio;
  const hasHoldings = p.holdings.length > 0;

  return (
    <Card className="border-border/70">
      <CardContent className="p-5 sm:p-6">
        {sheet.isError ? (
          <WidgetError message="Couldn't load your balance sheet." onRetry={sheet.refetch} />
        ) : sheet.isLoading ? (
          <WidgetSkeleton lines={5} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Net worth
              </div>
              <div className="mt-1 break-words font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                {currency(t.netWorth)}
              </div>
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  nwChange >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                )}
              >
                {nwChange >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {nwChange >= 0 ? "+" : "\u2212"}
                {currency(Math.abs(nwChange))} this month
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border/70 pt-5 sm:grid-cols-3">
                <HeroMetric
                  label="Available balance"
                  value={currency(t.totalBalance)}
                  hint={`${sheet.accountCount} account${sheet.accountCount === 1 ? "" : "s"}`}
                />
                <HeroMetric
                  label="Portfolio value"
                  value={investments.isError ? "\u2014" : currency(p.value)}
                  hint={
                    investments.isError
                      ? "Couldn't load"
                      : `${p.holdings.length} holding${p.holdings.length === 1 ? "" : "s"}`
                  }
                />
                <HeroMetric
                  label="Monthly surplus"
                  value={currency(t.monthSavings)}
                  hint={`${t.savingsRate}% savings rate`}
                  tone={t.monthSavings >= 0 ? "positive" : "negative"}
                />
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Investments</div>
                <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              {investments.isError ? (
                <WidgetError message="Couldn't load your portfolio." onRetry={investments.refetch} />
              ) : investments.isLoading ? (
                <WidgetSkeleton lines={3} className="mt-3" />
              ) : !hasHoldings ? (
                <WidgetEmpty
                  message="Track your investments to see portfolio value and gains."
                  actionLabel="Add investment"
                  onAction={() => openDialog("investment")}
                  className="py-3"
                />
              ) : (
                <>
                  <div className="mt-3 truncate font-display text-2xl font-semibold tabular-nums">
                    {currency(p.value)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <HeroMetric label="Invested" value={currency(p.invested)} />
                    <HeroMetric
                      label="Unrealised gain"
                      value={`${p.gain >= 0 ? "+" : "\u2212"}${currency(Math.abs(p.gain))}`}
                      hint={`${p.gain >= 0 ? "+" : "\u2212"}${Math.abs(p.gainPct).toFixed(1)}%`}
                      tone={p.gain >= 0 ? "positive" : "negative"}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="mt-3 w-full" asChild>
                    <Link to="/investments">
                      View portfolio
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HeroMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-xl",
          tone === "positive" && "text-primary",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </div>
      {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/* ----------------------------- needs attention ---------------------------- */

function NeedsAttention() {
  const sheet = useBalanceSheet();
  const bills = useBillsWidget();
  const goalsWidget = useGoalsWidget();
  const { month, previousMonth } = useMonthComparison();
  // Only genuinely near-term bills belong in the brief: a bill scheduled months
  // out is not "attention". This keeps the brief consistent with the
  // "Upcoming bills" widget, which uses the same 14-day window.
  const nextBill = bills.outlook.upcoming[0] ?? null;

  const insights = useMemo(
    () =>
      buildInsights({
        totals: sheet.totals,
        month,
        previousMonth,
        nextBill: nextBill ? { ...nextBill, name: nextBill.name } : null,
        goals: goalsWidget.goals,
        hasData: sheet.hasData,
      }),
    [sheet.totals, month, previousMonth, nextBill, goalsWidget.goals, sheet.hasData],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/70 lg:col-span-2">
        <CardHeader className="space-y-0">
          <CardTitle className="text-base font-semibold">Needs attention</CardTitle>
          <p className="text-sm text-muted-foreground">Today's brief, based on your activity</p>
        </CardHeader>
        <CardContent>
          {sheet.isError ? (
            <WidgetError message="Couldn't load today's brief." onRetry={sheet.refetch} />
          ) : sheet.isLoading ? (
            <WidgetSkeleton lines={3} />
          ) : insights.length === 0 ? (
            <WidgetEmpty message="Nothing needs your attention right now." className="py-2" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {insights.map((i) => (
                <InsightRow key={i.id} insight={i} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <UpcomingBillsCard />
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  return (
    <li className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
      <span
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          insight.tone === "positive" && "bg-primary",
          insight.tone === "warning" && "bg-destructive",
          insight.tone === "neutral" && "bg-muted-foreground",
        )}
      />
      <span className="text-muted-foreground">{insight.text}</span>
    </li>
  );
}

/* ---------------------------- getting started ---------------------------- */

/* ------------------------------- discovery -------------------------------- */

/** Compact, secondary entry points to the two flagship tools. */
function DiscoveryCards() {
  const items = [
    {
      to: "/ask-finora",
      icon: MessageSquare,
      title: "Ask Finora",
      description: "Ask questions about your money and get answers from your own data.",
    },
    {
      to: "/what-if",
      icon: Compass,
      title: "What If?",
      description: "Test a decision — a new EMI, more investing or a prepayment.",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:bg-muted/40"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <i.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{i.title}</div>
            <p className="truncate text-xs text-muted-foreground">{i.description}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}

function GettingStarted() {
  const { openDialog } = useFinance();
  const steps: Array<{ title: string; description: string; action: () => void; cta: string }> = [
    { title: "Add your first account", description: "Bank, cash or UPI wallet — this anchors your balances.", action: () => openDialog("account"), cta: "Add account" },
    { title: "Add your monthly income", description: "Salary, freelance or any other credit.", action: () => openDialog("income"), cta: "Add income" },
    { title: "Record your first expense", description: "Start building your spending picture.", action: () => openDialog("expense"), cta: "Add expense" },
    { title: "Create your first goal", description: "Emergency fund, travel, a new car — track it here.", action: () => openDialog("goal"), cta: "Create goal" },
  ];

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="font-display text-xl font-semibold">Welcome to Finora</CardTitle>
        <p className="text-sm text-muted-foreground">Let's build your financial picture.</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <div key={s.title} className="flex items-start gap-3 rounded-xl border border-border/70 p-4">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{s.title}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={s.action}>
                {s.cta}
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* -------------------------------- cash flow ------------------------------- */

function CashFlowCard() {
  const summary = useSummaryWidget();
  const data = useMemo(
    () => buildCashFlowSeries(summary.series(TREND_MONTHS)),
    [summary.categoryRows, summary.isLoading, summary.current.year, summary.current.month],
  );
  const hasActivity = data.some((d) => d.income > 0 || d.expense > 0);

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Cash flow</CardTitle>
          <p className="text-sm text-muted-foreground">Income, expenses & savings — last {TREND_MONTHS} months</p>
        </div>
        <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
          <LegendDot color="var(--chart-1)" label="Income" />
          <LegendDot color="var(--chart-2)" label="Expense" />
          <LegendDot color="var(--chart-3)" label="Savings" />
        </div>
      </CardHeader>
      <CardContent>
        {summary.isError ? (
          <WidgetError message="Couldn't load your monthly totals." onRetry={summary.refetch} />
        ) : summary.isLoading ? (
          <WidgetSkeleton lines={6} className="h-[260px]" />
        ) : !hasActivity ? (
          <WidgetEmpty message="No income or expenses recorded yet — add a transaction to see your cash flow." />
        ) : (
          <>
            <div className="h-[260px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatINRCompact} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                  <Bar dataKey="income" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="savings" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------- spending -------------------------------- */

function SpendingCard() {
  const summary = useSummaryWidget();
  const slices = useMemo(
    () => buildBreakdown(summary.categorySpend(summary.current), CHART_COLORS),
    [summary.categoryRows, summary.isLoading, summary.current.year, summary.current.month],
  );
  const total = useMemo(() => breakdownTotal(slices), [slices]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Spending</CardTitle>
        <p className="text-sm text-muted-foreground">By category, this month</p>
      </CardHeader>
      <CardContent>
        {summary.isError ? (
          <WidgetError message="Couldn't load category spending." onRetry={summary.refetch} />
        ) : summary.isLoading ? (
          <WidgetSkeleton lines={5} className="h-[200px]" />
        ) : slices.length === 0 ? (
          <WidgetEmpty message="No spending recorded this month — your category breakdown appears here." />
        ) : (
          <>
            <div className="relative h-[190px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
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
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-display text-lg font-semibold tabular-nums">{currency(total)}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {slices.slice(0, 5).map((c) => {
                const pct = percentOf(c.value, total);
                return (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span className="truncate font-medium">{c.name}</span>
                      </div>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {currency(c.value)} <span className="text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------- net worth ------------------------------- */

function NetWorthCard() {
  const summary = useSummaryWidget();
  const sheet = useBalanceSheet();
  const { month } = useMonthComparison();
  const netWorth = sheet.totals.netWorth;
  const changeThisMonth = netWorthChange(month);

  const series = useMemo(
    () => summary.series(TREND_MONTHS),
    [summary.categoryRows, summary.isLoading, summary.current.year, summary.current.month],
  );
  const data = useMemo(() => buildNetWorthSeries(series, netWorth), [series, netWorth]);

  const failed = sheet.isError || summary.isError;
  const busy = sheet.isLoading || summary.isLoading;
  const hasHistory = data.some((p) => p.value !== 0);

  return (
    <Card className="border-border/70 lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Net worth</CardTitle>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">Trailing {TREND_MONTHS} months</p>
            <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-normal text-muted-foreground">
              <Info className="h-3 w-3" />
              Reconstructed history
            </Badge>
          </div>
        </div>
        {!failed && !busy && (
          <div className="text-right">
            <div className="font-display text-lg font-semibold tabular-nums">{currency(netWorth)}</div>
            <div className={cn("text-xs", changeThisMonth >= 0 ? "text-primary" : "text-destructive")}>
              {changeThisMonth >= 0 ? "+" : "−"}
              {currency(Math.abs(changeThisMonth))} this month
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {failed ? (
          <WidgetError
            message="Couldn't load your net worth history."
            onRetry={() => {
              sheet.refetch();
              summary.refetch();
            }}
          />
        ) : busy ? (
          <WidgetSkeleton lines={5} className="h-[220px]" />
        ) : !hasHistory ? (
          <WidgetEmpty message="Add an account or a transaction to start tracking net worth." />
        ) : (
          <>
          <div className="h-[250px] w-full min-w-0 overflow-hidden">
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
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  fill="url(#nw)"
                  dot={(props: { cx?: number; cy?: number; index?: number }) =>
                    props.index === data.length - 1 ? (
                      <circle key="today" cx={props.cx} cy={props.cy} r={4} fill="var(--chart-1)" />
                    ) : (
                      <g key={props.index} />
                    )
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Only today's net worth ({currency(netWorth)}, solid point) is measured. Earlier months are
            reconstructed by removing each month's recorded ledger activity — not historical snapshots.
          </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------- goals --------------------------------- */

function GoalsCard() {
  const { goals, isLoading, isError, refetch } = useGoalsWidget();
  const { openDialog } = useFinance();
  const top = goals.slice(0, 3);
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Goals</CardTitle>
          <p className="text-sm text-muted-foreground">Your most relevant goals</p>
        </div>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <WidgetError message="Couldn't load your goals." onRetry={refetch} />
        ) : isLoading ? (
          <WidgetSkeleton lines={4} />
        ) : top.length === 0 ? (
          <WidgetEmpty
            message="Set a goal — an emergency fund or a big purchase — to track progress here."
            actionLabel="Create goal"
            onAction={() => openDialog("goal")}
            className="py-0"
          />
        ) : (
          top.map((g) => {
            const pct = percentOf(g.current, g.target);
            return (
              <div key={g.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <div className="truncate font-medium">{g.name}</div>
                  <div className="shrink-0 text-xs text-muted-foreground">By {formatDateIN(g.date)}</div>
                </div>
                <Progress value={Math.min(100, pct)} className="h-2" />
                <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                  <span>
                    {currency(g.current)} of {currency(g.target)}
                  </span>
                  <span className="font-medium text-foreground">{pct}%</span>
                </div>
              </div>
            );
          })
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={() => openDialog("contribution")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add contribution
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------------------- financial health ---------------------------- */

function HealthCard() {
  const sheet = useBalanceSheet();
  const health = useMemo(() => computeHealthScore(sheet.totals), [sheet.totals]);

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">Financial health</CardTitle>
          <p className="text-sm text-muted-foreground">Savings, debt & emergency fund</p>
        </div>
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {sheet.isError ? (
          <WidgetError message="Couldn't calculate your health score." onRetry={sheet.refetch} />
        ) : sheet.isLoading ? (
          <WidgetSkeleton lines={6} />
        ) : health.insufficientData ? (
          <div className="space-y-2">
            <Badge variant="secondary">Getting started</Badge>
            <p className="text-sm text-muted-foreground">
              We need a little more information before scoring your finances. Add an account, record
              your income and log a few expenses — your score appears automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="font-display text-xl font-semibold tabular-nums tracking-tight">
                {health.score}
                <span className="ml-0.5 text-sm font-normal text-muted-foreground">/ 100</span>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {health.label}
              </Badge>
            </div>
            <Progress value={health.score} className="mt-3 h-1.5" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {health.pillars.slice(0, 3).map((p) => (
                <div key={p.key} className="min-w-0 rounded-xl bg-muted/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{p.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {p.points}/{p.max}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.detail}</div>
                </div>
              ))}
            </div>
            <Collapsible className="mt-3">
              <CollapsibleTrigger className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
                View details
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-3 space-y-3">
                  {health.pillars.map((p) => (
                    <li key={p.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{p.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {p.points}/{p.max}
                        </span>
                      </div>
                      <Progress value={p.pct} className="mt-1 h-1.5" />
                      <div className="mt-1 text-xs text-muted-foreground">{p.detail}</div>
                    </li>
                  ))}
                  <li>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Investment mix</span>
                      <span className="tabular-nums text-muted-foreground">{health.investedShare}%</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Share of what you own that is invested (not scored)
                    </div>
                  </li>
                </ul>
                <p className="mt-4 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Strongest: <span className="font-medium text-foreground">{health.strongest.label}</span> · Needs
                  attention: <span className="font-medium text-foreground">{health.weakest.label}</span>
                </p>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------- recent transactions -------------------------- */

function RecentTransactionsCard() {
  const { transactions, isLoading, isError, refetch } = useRecentActivity();
  const { openDialog } = useFinance();
  const rows = transactions.slice(0, 8);
  return (
    <Card className="border-border/70 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Recent transactions</CardTitle>
          <p className="text-sm text-muted-foreground">Latest activity across your accounts</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/expenses">View all</Link>
        </Button>
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
              <li className="px-5 py-4">
                <WidgetEmpty
                  message="Start tracking your money to see your financial activity here."
                  actionLabel="Add transaction"
                  onAction={() => openDialog("expense")}
                  className="py-0"
                />
              </li>
            )}
            {rows.map((t) => {
              const positive = t.direction === "in";
              const neutral = t.direction === "neutral";
              const Icon = positive ? ArrowDownCircle : neutral ? ArrowLeftRight : ShoppingBag;
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
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
                  <div className="hidden text-xs text-muted-foreground lg:block">{formatDateIN(t.date)}</div>
                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 text-sm font-semibold tabular-nums",
                      positive ? "text-primary" : "text-foreground",
                    )}
                  >
                    {positive ? (
                      <ArrowDownRight className="hidden h-3.5 w-3.5 sm:block" />
                    ) : (
                      <ArrowUpRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                    )}
                    {positive ? "+" : neutral ? "" : "-"}
                    {currency(Math.abs(t.amount))}
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

/* ----------------------------- upcoming bills ----------------------------- */

const URGENCY_TONE: Record<BillUrgency, string> = {
  overdue: "border-destructive/40 text-destructive",
  today: "border-primary/40 text-primary",
  soon: "",
  later: "",
};

function UpcomingBillsCard() {
  const { openDialog } = useFinance();
  const { bills, outlook, isLoading, isError, refetch } = useBillsWidget();
  const rows = bills.slice(0, 5);
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-0">
        <CardTitle className="text-base font-semibold">Upcoming bills</CardTitle>
        <p className="text-sm text-muted-foreground">
          Overdue, due today or due within 14 days
          {outlook.overdueCount > 0 ? ` · ${outlook.overdueCount} overdue` : ""}
        </p>
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
              <li className="px-5 py-4 text-sm text-muted-foreground">
                Nothing due in the next 14 days. Add a bill to get reminders before it's due.
              </li>
            )}
            {rows.map((b) => {
              const Icon = b.icon ?? Receipt;
              return (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <Badge
                      variant="outline"
                      className={cn("mt-0.5 h-5 px-1.5 text-[10px] font-normal", URGENCY_TONE[b.urgency])}
                    >
                      {URGENCY_LABEL[b.urgency]} · {formatDateIN(b.dueISO)}
                    </Badge>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums">{currency(b.amount)}</div>
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

/* ------------------------------ quick actions ----------------------------- */

function QuickActions() {
  const { openDialog } = useFinance();
  const more: Array<{ label: string; icon: typeof Wallet; kind: Parameters<typeof openDialog>[0] }> = [
    { label: "Add income", icon: ArrowDownCircle, kind: "income" },
    { label: "Transfer", icon: ArrowLeftRight, kind: "transfer" },
    { label: "Add investment", icon: TrendingUp, kind: "investment" },
    { label: "Add account", icon: Wallet, kind: "account" },
    { label: "Add asset", icon: Landmark, kind: "asset" },
    { label: "Add liability", icon: CreditCard, kind: "liability" },
    { label: "Pay EMI", icon: Banknote, kind: "emi" },
    { label: "Dividend", icon: Sparkles, kind: "dividend" },
    { label: "Refund", icon: RotateCcw, kind: "refund" },
    { label: "Create goal", icon: Target, kind: "goal" },
    { label: "Add bill", icon: Receipt, kind: "bill" },
  ];

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" onClick={() => openDialog("expense")}>
        <Plus className="mr-1.5 h-4 w-4" />
        <span className="hidden sm:inline">Add transaction</span>
        <span className="sm:hidden">Add</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="More actions">
            More
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
          {more.map((m) => (
            <DropdownMenuItem key={m.label} onSelect={() => openDialog(m.kind)}>
              <m.icon className="mr-2 h-4 w-4" /> {m.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* --------------------------------- shared --------------------------------- */

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
