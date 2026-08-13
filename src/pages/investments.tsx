import { useState } from "react";
import { Plus, CalendarClock, ArrowDownLeft, ArrowUpRight, Trash2, Repeat } from "lucide-react";
import { RemoveInvestmentDialog } from "@/components/finance/remove-investment-dialog";
import { PortfolioHero } from "@/components/finance/investments/portfolio-hero";
import { HoldingsSection } from "@/components/finance/investments/holdings-section";
import { WidgetEmpty } from "@/components/finance/widget-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatDateIN } from "@/lib/format";
import { FREQUENCY_LABEL, type Frequency } from "@/services/bills";
import { freshness, latestPricedAt } from "@/services/market-refresh";
import { todayISO } from "@/lib/date-in";
import { usePriceRefresh } from "@/hooks/use-price-refresh";
import { useInvestments } from "@/hooks/use-investments";
import { useFinance } from "@/store/finance-store";

export function Investments() {
  const { openDialog, openEditDialog, removeSip, recordSipContribution } = useFinance();
  const { portfolio, schedules, isLoading, isError, refetch } = useInvestments();
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const today = todayISO();
  const { refresh, isRefreshing, summary, eligibleCount } = usePriceRefresh(portfolio.holdings);
  const lastPriced = latestPricedAt(portfolio.holdings);
  const lastUpdatedLabel = isRefreshing
    ? "Fetching latest prices…"
    : lastPriced
      ? freshness(lastPriced, today).label
      : "No market price yet";
  const summaryLabel = summary
    ? `${summary.updated} updated · ${summary.unchanged} already current · ${summary.unavailable} unavailable`
    : eligibleCount > 0
      ? `${eligibleCount} holding${eligibleCount === 1 ? "" : "s"} refresh automatically from AMFI / NSE / BSE`
      : "Add a scheme code or ticker to refresh prices automatically";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden">
      <header className="space-y-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3 sm:space-y-0">
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Investments &amp; Savings
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Mutual funds, equities, deposits, small savings and gold — one portfolio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <Button size="sm" variant="outline" onClick={() => openDialog("sip")}>
            <Repeat className="mr-1 h-4 w-4" /> Contribution
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDialog("redemption")}>
            <ArrowUpRight className="mr-1 h-4 w-4" /> Sell
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDialog("investment")}>
            <ArrowDownLeft className="mr-1 h-4 w-4" /> Buy
          </Button>
          <Button size="sm" onClick={() => openDialog("asset")}>
            <Plus className="mr-1 h-4 w-4" /> Add investment
          </Button>
        </div>
      </header>

      <PortfolioHero
        portfolio={portfolio}
        monthlyOutflow={schedules.monthlyOutflow}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onAdd={() => openDialog("asset")}
      />

      <HoldingsSection
        holdings={portfolio.holdings}
        today={today}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onAdd={() => openDialog("asset")}
        onEdit={(h) => openEditDialog({ kind: "asset", entity: h })}
        onRemove={(h) => setRemoving({ id: h.id, name: h.name })}
        refresh={() => void refresh()}
        isRefreshing={isRefreshing}
        eligibleCount={eligibleCount}
        lastUpdatedLabel={lastUpdatedLabel}
        summaryLabel={summaryLabel}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Recurring contributions</CardTitle>
            <span className="text-xs text-muted-foreground">
              {formatINR(schedules.monthlyOutflow)}/month
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.active.length === 0 && (
              <WidgetEmpty
                message="No SIP or recurring deposit scheduled yet."
                actionLabel="Add contribution"
                onAction={() => openDialog("sip")}
                className="py-2"
              />
            )}
            {schedules.active.map((c) => (
              <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 p-3">
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
              <p className="py-2 text-sm text-muted-foreground">
                No investment with a maturity date yet.
              </p>
            )}
            {portfolio.maturing.map((h) => (
              <div key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 p-3">
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
        <Card className="border-border/70">
          <CardHeader><CardTitle className="text-base font-semibold">Closed holdings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {portfolio.closed.map((h) => (
              <div key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground">{h.name} · {h.type}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">Fully redeemed</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <RemoveInvestmentDialog holding={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}