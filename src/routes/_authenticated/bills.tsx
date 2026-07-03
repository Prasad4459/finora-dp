import { createFileRoute } from "@tanstack/react-router";
import { Plus, Home, Zap, Wifi, CreditCard, Smartphone, ShieldCheck, Tv, Receipt } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({ meta: [{ title: "Bills & Reminders — MoneyOS" }] }),
  component: Bills,
});

const bills = [
  { id: 1, name: "House Rent", category: "Rent", due: "05/07/2026", amount: 18000, icon: Home, status: "Upcoming" },
  { id: 2, name: "BESCOM Electricity", category: "Utilities", due: "08/07/2026", amount: 2450, icon: Zap, status: "Upcoming" },
  { id: 3, name: "Jio Fiber", category: "Internet", due: "12/07/2026", amount: 999, icon: Wifi, status: "Upcoming" },
  { id: 4, name: "HDFC Credit Card", category: "Credit Card", due: "15/07/2026", amount: 12500, icon: CreditCard, status: "Upcoming" },
  { id: 5, name: "Airtel Postpaid", category: "Mobile", due: "18/07/2026", amount: 599, icon: Smartphone, status: "Upcoming" },
  { id: 6, name: "HDFC ERGO Health", category: "Insurance", due: "22/07/2026", amount: 14500, icon: ShieldCheck, status: "Upcoming" },
  { id: 7, name: "Netflix + Prime", category: "Subscriptions", due: "25/07/2026", amount: 1148, icon: Tv, status: "Upcoming" },
  { id: 8, name: "SBI Home Loan EMI", category: "EMI", due: "01/08/2026", amount: 32500, icon: Home, status: "Scheduled" },
];

function Bills() {
  const total = bills.reduce((s, b) => s + b.amount, 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Bills & Reminders"
        description="Never miss a due date."
        actions={<Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add bill</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Upcoming (30 days)" value={String(bills.length)} icon={Receipt} />
        <StatCard label="Total due" value={formatINR(total)} icon={Receipt} tone="negative" />
        <StatCard label="Next due" value={bills[0].due} delta={bills[0].name} icon={Receipt} />
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Upcoming bills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {bills.map((b) => {
              const Icon = b.icon;
              return (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{b.category}</div>
                  </div>
                  <Badge variant="secondary" className="hidden sm:inline-flex text-[10px]">Due {b.due}</Badge>
                  <div className="w-28 text-right text-sm font-semibold tabular-nums">{formatINR(b.amount)}</div>
                  <Button size="sm" variant="outline">Pay</Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}