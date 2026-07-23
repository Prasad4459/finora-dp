import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wallet, Landmark, CreditCard, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDateIN } from "@/lib/format";
import { useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Accounts — MoneyOS" }] }),
  component: Accounts,
});

function Accounts() {
  const { accounts, openDialog, removeAccount } = useFinance();
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const assets = accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0);
  const debt = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Wallets & Accounts"
        description="All your bank, cash, and investment accounts."
        actions={
          <Button size="sm" onClick={() => openDialog("account")}>
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
