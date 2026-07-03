import { createFileRoute } from "@tanstack/react-router";
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
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatINR, formatINRExact, formatINRCompact } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MoneyOS" }] }),
  component: Dashboard,
});

const cashFlowData = [
  { month: "Jan", income: 82000, expense: 41000 },
  { month: "Feb", income: 85000, expense: 44000 },
  { month: "Mar", income: 85000, expense: 47000 },
  { month: "Apr", income: 90000, expense: 42000 },
  { month: "May", income: 88000, expense: 51000 },
  { month: "Jun", income: 92000, expense: 48000 },
  { month: "Jul", income: 85000, expense: 42500 },
];

const netWorthData = [
  { month: "Jan", value: 1250000 },
  { month: "Feb", value: 1340000 },
  { month: "Mar", value: 1450000 },
  { month: "Apr", value: 1580000 },
  { month: "May", value: 1690000 },
  { month: "Jun", value: 1780000 },
  { month: "Jul", value: 1875000 },
];

const expenseBreakdown = [
  { name: "Rent", value: 18000, color: "var(--chart-1)" },
  { name: "Groceries", value: 8500, color: "var(--chart-2)" },
  { name: "Fuel", value: 4200, color: "var(--chart-3)" },
  { name: "EMI", value: 6500, color: "var(--chart-4)" },
  { name: "Entertainment", value: 2800, color: "var(--chart-5)" },
  { name: "Miscellaneous", value: 2500, color: "var(--muted-foreground)" },
];

const recentTransactions = [
  { id: 1, name: "BigBasket", category: "Groceries", account: "HDFC •• 4021", date: "02/07/2026", amount: -2450, icon: ShoppingBag },
  { id: 2, name: "Salary — Infosys Ltd.", category: "Salary", account: "SBI •• 8891", date: "01/07/2026", amount: 85000, icon: ArrowDownCircle },
  { id: 3, name: "Ola Cabs", category: "Travel", account: "ICICI •• 1009", date: "30/06/2026", amount: -320, icon: Car },
  { id: 4, name: "Netflix", category: "Entertainment", account: "HDFC •• 4021", date: "29/06/2026", amount: -649, icon: Film },
  { id: 5, name: "Swiggy", category: "Food & Dining", account: "Axis •• 3320", date: "29/06/2026", amount: -540, icon: Utensils },
  { id: 6, name: "Apollo Pharmacy", category: "Healthcare", account: "HDFC •• 4021", date: "28/06/2026", amount: -820, icon: Heart },
];

const upcomingBills = [
  { id: 1, name: "Rent", due: "05/07/2026", amount: 18000, icon: Home },
  { id: 2, name: "Electricity", due: "08/07/2026", amount: 2450, icon: Zap },
  { id: 3, name: "Jio Fiber", due: "12/07/2026", amount: 999, icon: Wifi },
  { id: 4, name: "HDFC Credit Card", due: "15/07/2026", amount: 12500, icon: CreditCard },
];

const recentIncome = [
  { id: 1, name: "Salary — Infosys Ltd.", date: "01/07/2026", amount: 85000 },
  { id: 2, name: "Freelance — Acme Co.", date: "28/06/2026", amount: 22000 },
  { id: 3, name: "TCS Dividend", date: "15/06/2026", amount: 3600 },
  { id: 4, name: "SBI Interest", date: "20/06/2026", amount: 1240 },
];

const goals = [
  { id: 1, name: "Emergency Fund", target: 500000, saved: 325000, eta: "Mar 2027" },
  { id: 2, name: "Goa Vacation", target: 80000, saved: 46000, eta: "Dec 2026" },
  { id: 3, name: "New MacBook", target: 220000, saved: 90000, eta: "Feb 2027" },
];

const currency = formatINR;
const currencyExact = formatINRExact;

function Dashboard() {
  const savingsRate = Math.round(((85000 - 42500) / 85000) * 100);
  const healthScore = 78;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description="A calm overview of your finances."
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add transaction
          </Button>
        }
      />

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total balance" value={currency(245000)} delta="Across 4 accounts" icon={Wallet} />
        <StatCard label="Net worth" value={currency(1875000)} delta="+5.3% this month" icon={TrendingUp} tone="positive" />
        <StatCard label="Monthly income" value={currency(85000)} delta="+4.2% vs last mo." icon={ArrowDownCircle} tone="positive" />
        <StatCard label="Monthly expenses" value={currency(42500)} delta="-2.1% vs last mo." icon={ArrowUpCircle} tone="negative" />
        <StatCard label="Savings rate" value={`${savingsRate}%`} delta="Healthy — above 40%" icon={PiggyBank} tone="positive" />
        <StatCard label="Total investments" value={currency(1237000)} delta="MF, Stocks, PPF, EPF" icon={TrendingUp} />
        <StatCard label="Total debt" value={currency(460250)} delta="Home + Car + CC" icon={CreditCard} tone="negative" />
        <StatCard label="Upcoming bills" value={currency(33949)} delta="4 bills in 2 weeks" icon={Receipt} />
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
            <Button variant="secondary" size="sm">
              <ArrowDownCircle className="mr-1.5 h-4 w-4 text-primary" />
              Add income
            </Button>
            <Button variant="secondary" size="sm">
              <ArrowUpCircle className="mr-1.5 h-4 w-4 text-destructive" />
              Add expense
            </Button>
            <Button variant="secondary" size="sm">
              <Landmark className="mr-1.5 h-4 w-4" />
              Add asset
            </Button>
            <Button variant="secondary" size="sm">
              <CreditCard className="mr-1.5 h-4 w-4" />
              Add liability
            </Button>
            <Button variant="secondary" size="sm">
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
              {recentTransactions.map((t) => {
                const positive = t.amount > 0;
                const Icon = t.icon;
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
                      <div className="truncate text-sm font-medium">{t.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.category} • {t.account}
                      </div>
                    </div>
                    <div className="hidden text-xs text-muted-foreground sm:block">{t.date}</div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-sm font-semibold tabular-nums",
                        positive ? "text-primary" : "text-foreground",
                      )}
                    >
                      {positive ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      {positive ? "+" : "-"}
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
              <Button variant="outline" size="sm" className="w-full">
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
