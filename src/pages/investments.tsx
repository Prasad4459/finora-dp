import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, PiggyBank, CalendarClock, Pencil, ArrowDownLeft, ArrowUpRight, Trash2, Repeat, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { RemoveInvestmentDialog } from "@/components/finance/remove-investment-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDateIN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FREQUENCY_LABEL, type Frequency } from "@/services/bills";
import { instrumentMeta } from "@/services/instruments";
import { freshness, isRefreshable, latestPricedAt } from "@/services/market-refresh";
import { todayISO } from "@/lib/date-in";
import { usePriceRefresh } from "@/hooks/use-price-refresh";
import { useInvestments } from "@/hooks/use-investments";
import { useFinance } from "@/store/finance-store";

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export function Investments() {
  const { openDialog, openEditDialog, removeSip, recordSipContribution } = useFinance();
  const { portfolio, schedules } = useInvestments();
  const positive = portfolio.gain >= 0;
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const today = todayISO();
  const { refresh, isRefreshing, summary, eligibleCount } = usePriceRefresh(portfolio.holdings);
  const lastPriced = latestPricedAt(portfolio.holdings);
  const lastUpdatedLabel = lastPriced
    ? freshness(lastPriced, today).label
    : "No market price yet";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Investments & Savings"
        description="Mutual funds, equities, deposits, small savings and gold — one portfolio."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={isRefreshing}>
              <RefreshCw className={cn("mr-1 h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing…" : "Refresh prices"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("sip")}>
              <Repeat className="mr-1 h-4 w-4" /> Add contribution
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("redemption")}>
              <ArrowUpRight className="mr-1 h-4 w-4" /> Sell / redeem
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("investment")}>
              <ArrowDownLeft className="mr-1 h-4 w-4" /> Buy / add units
            </Button>
            <Button size="sm" onClick={() => openDialog("asset")}>
              <Plus className="mr-1 h-4 w-4" /> Add investment
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Portfolio value" value={formatINR(portfolio.value)} icon={Wallet} tone="positive" />
        <StatCard label="Invested amount" value={formatINR(portfolio.invested)} icon={PiggyBank} />
        <StatCard
          label="Unrealised gain"
          value={formatINR(portfolio.gain)}
          icon={positive ? TrendingUp : TrendingDown}
          tone={positive ? "positive" : "negative"}
        />
        <StatCard
          label="Overall return"
          value={pct(portfolio.gainPct)}
          delta={`${portfolio.holdings.length} active holdings`}
          icon={positive ? TrendingUp : TrendingDown}
          tone={positive ? "positive" : "negative"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-1">
          <CardHeader><CardTitle className="text-base font-semibold">Allocation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {portfolio.allocation.length === 0 && (
              <p className="text-sm text-muted-foreground">Add an investment to see your allocation.</p>
            )}
            {portfolio.allocation.map((slice) => (
              <div key={slice.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{slice.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatINR(slice.value)} · {slice.pct.toFixed(1)}%
                  </span>
                </div>
                <Progress value={slice.pct} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Holdings</CardTitle>
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdatedLabel}
              {summary
                ? ` · ${summary.updated} updated, ${summary.unavailable} unavailable`
                : eligibleCount > 0
                  ? ` · ${eligibleCount} tracked`
                  : ""}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holding</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Invested</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Gain</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.holdings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No investments yet. Add your first mutual fund, FD or PPF account.
                    </TableCell>
                  </TableRow>
                )}
                {portfolio.holdings.map((h) => {
                  const meta = instrumentMeta(h.type);
                  return (
                    <TableRow key={h.id}>
                      <TableCell>
                        <div className="font-medium">{h.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.type}
                          {h.institution ? ` · ${h.institution}` : ""}
                          {h.avgCost ? ` · avg ₹${h.avgCost.toFixed(2)}` : ""}
                          {meta.rate && h.rate ? ` · ${h.rate}% p.a.` : ""}
                        </div>
                        {isRefreshable(h) && (
                          <div
                            className={cn(
                              "mt-0.5 text-[11px]",
                              freshness(h.lastPriceAt, today).status === "today"
                                ? "text-primary"
                                : freshness(h.lastPriceAt, today).status === "unavailable"
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                            )}
                          >
                            {freshness(h.lastPriceAt, today).label}
                            {h.symbol ? ` · ${h.symbol}` : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{h.className}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{h.units ? h.units : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(h.invested)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatINR(h.value)}</TableCell>
                      <TableCell className={cn("text-right font-semibold tabular-nums", h.gain >= 0 ? "text-primary" : "text-destructive")}>
                        {h.gain >= 0 ? "+" : ""}{formatINR(h.gain)}
                        <span className="ml-1 text-xs opacity-70">({pct(h.gainPct)})</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog({ kind: "asset", entity: h })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`Remove ${h.name}`}
                            onClick={() => setRemoving({ id: h.id, name: h.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Recurring contributions</CardTitle>
            <span className="text-xs text-muted-foreground">
              {formatINR(schedules.monthlyOutflow)}/month
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.active.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No SIP or recurring deposit scheduled yet.
              </p>
            )}
            {schedules.active.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.assetName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatINR(c.amount)} · {FREQUENCY_LABEL[c.frequency as Frequency] ?? c.frequency} · next {formatDateIN(c.nextDueISO)}
                    {c.autoDebit ? " · auto debit" : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {c.isDue && <Badge className="text-[10px]">Due</Badge>}
                  <Button size="sm" variant="outline" onClick={() => recordSipContribution(c.id)}>
                    Record
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeSip(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Maturities</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {portfolio.maturing.length === 0 && (
              <p className="text-sm text-muted-foreground">No investment with a maturity date yet.</p>
            )}
            {portfolio.maturing.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Matures {formatDateIN(h.maturityDate!)}
                    {h.maturityValue ? ` · ${formatINR(h.maturityValue)}` : ""}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {(h.daysToMaturity ?? 0) < 0 ? "Matured" : `${h.daysToMaturity} days`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {portfolio.closed.length > 0 && (
        <Card className="mt-6 border-border/70">
          <CardHeader><CardTitle className="text-base font-semibold">Closed holdings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {portfolio.closed.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{h.name} · {h.type}</span>
                <Badge variant="outline" className="text-[10px]">Fully redeemed</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <RemoveInvestmentDialog holding={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}