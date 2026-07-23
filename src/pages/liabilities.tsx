import { Plus, CreditCard, Wallet, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDateIN } from "@/lib/format";
import { useFinance } from "@/store/finance-store";


export function Liabilities() {
  const { liabilities, openDialog, removeLiability } = useFinance();
  const total = liabilities.reduce((s, l) => s + l.balance, 0);
  const emi = liabilities.reduce((s, l) => s + l.emi, 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Liabilities"
        description="Loans, cards, and everything you owe."
        actions={
          <Button size="sm" onClick={() => openDialog("liability")}>
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
                <TableHead className="w-10" />
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
                  <TableCell><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLiability(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
