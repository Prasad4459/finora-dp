import { Plus, ArrowUpCircle, TrendingDown, Calendar, Trash2 } from "lucide-react";
import { Bar, BarChart, Cell, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatINRCompact, formatDateIN } from "@/lib/format";
import { useFinance } from "@/store/finance-store";


const catBreakdown = [
  { name: "Rent", value: 18000, color: "var(--chart-1)" },
  { name: "Groceries", value: 8500, color: "var(--chart-2)" },
  { name: "Food", value: 5600, color: "var(--chart-3)" },
  { name: "Fuel", value: 4200, color: "var(--chart-4)" },
  { name: "EMI", value: 6500, color: "var(--chart-5)" },
  { name: "Others", value: 2500, color: "var(--muted-foreground)" },
];

const trend = [
  { month: "Feb", value: 44000 },
  { month: "Mar", value: 47000 },
  { month: "Apr", value: 42000 },
  { month: "May", value: 51000 },
  { month: "Jun", value: 48000 },
  { month: "Jul", value: 42500 },
];

export function Expenses() {
  const { expenses, openDialog, removeExpense } = useFinance();
  const monthTotal = expenses.filter((e) => e.date.startsWith("2026-07")).reduce((s, e) => s + e.amount, 0);
  const ytd = expenses.reduce((s, e) => s + e.amount, 0);
  const avg = Math.round(ytd / trend.length);
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
        <StatCard label="Today" value={formatINR(0)} icon={Calendar} />
        <StatCard label="This month" value={formatINR(monthTotal)} tone="negative" icon={ArrowUpCircle} />
        <StatCard label="Year to date" value={formatINR(ytd)} tone="negative" icon={ArrowUpCircle} />
        <StatCard label="Avg / month" value={formatINR(avg)} icon={TrendingDown} />
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catBreakdown} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
                    {catBreakdown.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
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
                  <TableCell><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeExpense(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
