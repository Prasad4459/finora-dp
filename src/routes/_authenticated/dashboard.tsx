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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MoneyOS" }] }),
  component: Dashboard,
});

const cashFlowData = [
  { month: "Jan", income: 6200, expense: 4100 },
  { month: "Feb", income: 5800, expense: 4400 },
  { month: "Mar", income: 6400, expense: 4700 },
  { month: "Apr", income: 7100, expense: 4200 },
  { month: "May", income: 6900, expense: 5100 },
  { month: "Jun", income: 7400, expense: 4800 },
  { month: "Jul", income: 7800, expense: 5200 },
];

const netWorthData = [
  { month: "Jan", value: 42000 },
  { month: "Feb", value: 44500 },
  { month: "Mar", value: 46100 },
  { month: "Apr", value: 49200 },
  { month: "May", value: 51000 },
  { month: "Jun", value: 54300 },
  { month: "Jul", value: 58120 },
];

const expenseBreakdown = [
  { name: "Housing", value: 1800, color: "var(--chart-1)" },
  { name: "Food", value: 620, color: "var(--chart-2)" },
  { name: "Transport", value: 340, color: "var(--chart-3)" },
  { name: "Shopping", value: 480, color: "var(--chart-4)" },
  { name: "Entertainment", value: 220, color: "var(--chart-5)" },
  { name: "Other", value: 180, color: "var(--muted-foreground)" },
];

const recentTransactions = [
  { id: 1, name: "Whole Foods Market", category: "Groceries", account: "Chase •• 4021", date: "Jul 02", amount: -84.32, icon: ShoppingBag },
  { id: 2, name: "Salary — Acme Inc.", category: "Income", account: "Chase •• 4021", date: "Jul 01", amount: 5400.0, icon: ArrowDownCircle },
  { id: 3, name: "Uber", category: "Transport", account: "Amex •• 1009", date: "Jun 30", amount: -18.5, icon: Car },
  { id: 4, name: "Netflix", category: "Entertainment", account: "Amex •• 1009", date: "Jun 29", amount: -15.99, icon: Film },
  { id: 5, name: "Blue Bottle Coffee", category: "Food", account: "Chase •• 4021", date: "Jun 29", amount: -6.75, icon: Utensils },
  { id: 6, name: "Pharmacy", category: "Health", account: "Chase •• 4021", date: "Jun 28", amount: -32.1, icon: Heart },
];

const upcomingBills = [
  { id: 1, name: "Rent", due: "Jul 05", amount: 1800, icon: Home },
  { id: 2, name: "Electricity", due: "Jul 08", amount: 92.4, icon: Zap },
  { id: 3, name: "Internet", due: "Jul 12", amount: 59.99, icon: Wifi },
  { id: 4, name: "Credit Card", due: "Jul 15", amount: 420.5, icon: CreditCard },
];

const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const currencyExact = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function Dashboard() {
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
        <StatCard label="Total balance" value={currency(24380)} delta="Across 4 accounts" icon={Wallet} />
        <StatCard label="Net worth" value={currency(58120)} delta="+7.0% this month" icon={TrendingUp} tone="positive" />
        <StatCard label="Monthly income" value={currency(7800)} delta="+5.4% vs last mo." icon={ArrowDownCircle} tone="positive" />
        <StatCard label="Monthly expenses" value={currency(5200)} delta="+1.9% vs last mo." icon={ArrowUpCircle} tone="negative" />
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
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
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
            <div className="text-lg font-semibold tabular-nums">{currency(58120)}</div>
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
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip content={<ChartTooltip valueFormatter={currencyExact} />} />
                <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill="url(#nw)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
