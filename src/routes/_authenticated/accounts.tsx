import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wallet, Landmark, Banknote, CreditCard, Smartphone, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDateIN } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Accounts — MoneyOS" }] }),
  component: Accounts,
});

const accounts = [
  { id: 1, name: "Salary Account", bank: "HDFC Bank", type: "Savings", balance: 142500, icon: Landmark, color: "bg-blue-500/10 text-blue-600", updated: "2026-07-02" },
  { id: 2, name: "Joint Savings", bank: "SBI", type: "Savings", balance: 68200, icon: Landmark, color: "bg-emerald-500/10 text-emerald-600", updated: "2026-07-01" },
  { id: 3, name: "Everyday Spending", bank: "ICICI Bank", type: "Current", balance: 21400, icon: Wallet, color: "bg-orange-500/10 text-orange-600", updated: "2026-07-02" },
  { id: 4, name: "GPay Wallet", bank: "Google Pay", type: "UPI Wallet", balance: 3800, icon: Smartphone, color: "bg-fuchsia-500/10 text-fuchsia-600", updated: "2026-07-02" },
  { id: 5, name: "Cash on hand", bank: "—", type: "Cash", balance: 9200, icon: Banknote, color: "bg-amber-500/10 text-amber-600", updated: "2026-06-30" },
  { id: 6, name: "Amazon Pay ICICI CC", bank: "ICICI Bank", type: "Credit Card", balance: -12500, icon: CreditCard, color: "bg-rose-500/10 text-rose-600", updated: "2026-07-02" },
  { id: 7, name: "Zerodha", bank: "Zerodha", type: "Investment Account", balance: 484000, icon: TrendingUp, color: "bg-violet-500/10 text-violet-600", updated: "2026-07-01" },
];

function Accounts() {
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const assets = accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0);
  const debt = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Wallets & Accounts"
        description="All your bank, cash, and investment accounts."
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add account
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Net position" value={formatINR(total)} icon={Wallet} tone="positive" />
        <StatCard label="Total in accounts" value={formatINR(assets)} icon={Landmark} />
        <StatCard label="Card outstanding" value={formatINR(debt)} icon={CreditCard} tone="negative" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.id} className="border-border/70">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${a.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{a.type}</Badge>
                </div>
                <div className="mt-3 text-sm font-semibold">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.bank}</div>
                <div className={`mt-3 text-xl font-semibold tabular-nums ${a.balance < 0 ? "text-destructive" : ""}`}>
                  {formatINR(a.balance)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">All accounts</CardTitle>
          <Input placeholder="Search accounts..." className="h-8 w-56" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{a.type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{a.bank}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateIN(a.updated)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${a.balance < 0 ? "text-destructive" : ""}`}>{formatINR(a.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
