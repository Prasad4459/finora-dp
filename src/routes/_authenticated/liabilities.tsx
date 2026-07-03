import { createFileRoute } from "@tanstack/react-router";
import { Plus, CreditCard, Wallet } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDateIN } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/liabilities")({
  head: () => ({ meta: [{ title: "Liabilities — MoneyOS" }] }),
  component: Liabilities,
});

const liabilities = [
  { id: 1, name: "SBI Home Loan", type: "Home Loan", balance: 3850000, rate: 8.5, emi: 32500, due: "2026-08-01", remaining: 168, status: "Active" },
  { id: 2, name: "HDFC Car Loan", type: "Car Loan", balance: 420000, rate: 9.2, emi: 12800, due: "2026-07-15", remaining: 36, status: "Active" },
  { id: 3, name: "Axis Education Loan", type: "Education Loan", balance: 180000, rate: 10.5, emi: 8500, due: "2026-07-20", remaining: 24, status: "Active" },
  { id: 4, name: "Personal Loan — Bajaj", type: "Personal Loan", balance: 90000, rate: 13.0, emi: 7500, due: "2026-07-10", remaining: 14, status: "Active" },
  { id: 5, name: "HDFC Credit Card", type: "Credit Card", balance: 12500, rate: 36.0, emi: 0, due: "2026-07-15", remaining: 1, status: "Due" },
  { id: 6, name: "Loan from Dad", type: "Borrowed Money", balance: 50000, rate: 0, emi: 5000, due: "2026-07-30", remaining: 10, status: "Active" },
];

function Liabilities() {
  const total = liabilities.reduce((s, l) => s + l.balance, 0);
  const emi = liabilities.reduce((s, l) => s + l.emi, 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Liabilities"
        description="Loans, cards, and everything you owe."
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add liability
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total outstanding" value={formatINR(total)} icon={CreditCard} tone="negative" />
        <StatCard label="Monthly EMI" value={formatINR(emi)} icon={Wallet} />
        <StatCard label="Active accounts" value={String(liabilities.length)} icon={CreditCard} />
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader><CardTitle className="text-base font-semibold">All liabilities</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">EMI</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead className="text-right">Months left</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liabilities.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.type}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-destructive">{formatINR(l.balance)}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.rate}%</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(l.emi)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateIN(l.due)}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.remaining}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === "Due" ? "destructive" : "secondary"} className="text-[10px]">{l.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
