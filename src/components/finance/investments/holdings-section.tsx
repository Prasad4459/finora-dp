// Presentation only — grouping and formatting of holdings already computed by
// services/portfolio. No valuation maths lives here.
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { instrumentMeta } from "@/services/instruments";
import { freshness, isRefreshable } from "@/services/market-refresh";
import type { Holding } from "@/services/portfolio";
import { sliceColor } from "./portfolio-hero";

const pct = (n: number) => `${n >= 0 ? "+" : "\u2212"}${Math.abs(n).toFixed(1)}%`;
const signedINR = (n: number) => `${n >= 0 ? "+" : "\u2212"}${formatINR(Math.abs(n))}`;

type Group = { key: string; label: string; value: number; rows: Holding[] };

function groupHoldings(holdings: Holding[]): Group[] {
  const map = new Map<string, Group>();
  holdings.forEach((h) => {
    const g = map.get(h.assetClass) ?? { key: h.assetClass, label: h.className, value: 0, rows: [] };
    g.value += h.value;
    g.rows.push(h);
    map.set(h.assetClass, g);
  });
  return [...map.values()].sort((a, b) => b.value - a.value);
}

function Subline({ h, today }: { h: Holding; today: string }) {
  const meta = instrumentMeta(h.type);
  const f = isRefreshable(h) ? freshness(h.lastPriceAt, today) : null;
  return (
    <div className="mt-0.5 space-y-0.5">
      <div className="text-xs text-muted-foreground">
        {h.type}
        {h.institution ? ` \u00b7 ${h.institution}` : ""}
        {meta.rate && h.rate ? ` \u00b7 ${h.rate}% p.a.` : ""}
      </div>
      {f && (
        <div
          className={cn(
            "text-[11px]",
            f.status === "today"
              ? "text-primary"
              : f.status === "unavailable"
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {f.label}
          {h.symbol ? ` \u00b7 ${h.symbol}` : ""}
        </div>
      )}
    </div>
  );
}

function RowActions({
  h,
  onEdit,
  onRemove,
}: {
  h: Holding;
  onEdit: (h: Holding) => void;
  onRemove: (h: Holding) => void;
}) {
  return (
    <div className="flex items-center">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={`Edit ${h.name}`}
        onClick={() => onEdit(h)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={`Remove ${h.name}`}
        onClick={() => onRemove(h)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function HoldingsSection({
  holdings,
  today,
  isLoading,
  isError,
  onRetry,
  onAdd,
  onEdit,
  onRemove,
  refresh,
  isRefreshing,
  eligibleCount,
  lastUpdatedLabel,
  summaryLabel,
}: {
  holdings: Holding[];
  today: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAdd: () => void;
  onEdit: (h: Holding) => void;
  onRemove: (h: Holding) => void;
  refresh: () => void;
  isRefreshing: boolean;
  eligibleCount: number;
  lastUpdatedLabel: string;
  summaryLabel: string | null;
}) {
  const groups = groupHoldings(holdings);
  const total = holdings.reduce((s, h) => s + h.value, 0);

  return (
    <Card className="border-border/70">
      <CardHeader className="gap-3 pb-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Holdings</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {holdings.length} active {holdings.length === 1 ? "holding" : "holdings"}
              {eligibleCount > 0 ? ` \u00b7 ${eligibleCount} price-tracked` : " \u00b7 manually valued"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing\u2026" : "Refresh prices"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{lastUpdatedLabel}</span>
          {summaryLabel && <span>{`\u00b7 ${summaryLabel}`}</span>}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isError ? (
          <div className="px-5 pb-5">
            <WidgetError message="Couldn't load your holdings." onRetry={onRetry} />
          </div>
        ) : isLoading ? (
          <div className="px-5 pb-5">
            <WidgetSkeleton lines={5} />
          </div>
        ) : holdings.length === 0 ? (
          <div className="px-5 pb-5">
            <WidgetEmpty
              message="No holdings yet. Add a mutual fund, stock, FD or PPF account to start tracking value and gains."
              actionLabel="Add investment"
              onAction={onAdd}
            />
          </div>
        ) : (
          <>
            {/* Desktop: dense table grouped by asset class */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Holding</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">Current value</TableHead>
                    <TableHead className="text-right">Unrealised gain</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <>
                      <TableRow key={`g-${g.key}`} className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={3} className="py-2">
                          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: sliceColor(g.key) }}
                            />
                            {g.label}
                            <span className="font-normal normal-case text-muted-foreground">
                              {g.rows.length} {g.rows.length === 1 ? "holding" : "holdings"}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs font-semibold tabular-nums">
                          {formatINR(g.value)}
                        </TableCell>
                        <TableCell colSpan={2} className="py-2 text-right text-xs text-muted-foreground">
                          {total > 0 ? `${((g.value / total) * 100).toFixed(1)}% of portfolio` : ""}
                        </TableCell>
                      </TableRow>
                      {g.rows.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="max-w-[22rem]">
                            <div className="truncate font-medium">{h.name}</div>
                            <Subline h={h} today={today} />
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                            {h.units ? h.units : "\u2014"}
                            {h.avgCost ? (
                              <div className="text-xs">avg \u20b9{h.avgCost.toFixed(2)}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {formatINR(h.invested)}
                          </TableCell>
                          <TableCell className="text-right font-display font-semibold tabular-nums">
                            {formatINR(h.value)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className={cn(
                                "font-semibold tabular-nums",
                                h.gain >= 0 ? "text-primary" : "text-destructive",
                              )}
                            >
                              {signedINR(h.gain)}
                            </div>
                            <div className="text-xs text-muted-foreground tabular-nums">
                              {pct(h.gainPct)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <RowActions h={h} onEdit={onEdit} onRemove={onRemove} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: one card per holding, no horizontal scrolling */}
            <div className="space-y-4 p-4 md:hidden">
              {groups.map((g) => (
                <div key={g.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2 font-semibold uppercase tracking-wide">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: sliceColor(g.key) }}
                      />
                      <span className="truncate">{g.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatINR(g.value)}
                    </span>
                  </div>
                  {g.rows.map((h) => (
                    <div key={h.id} className="rounded-xl border border-border/70 p-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0">
                          <div className="break-words text-sm font-medium">{h.name}</div>
                          <Subline h={h} today={today} />
                        </div>
                        <RowActions h={h} onEdit={onEdit} onRemove={onRemove} />
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3 border-t border-border/70 pt-3">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Current value
                          </div>
                          <div className="truncate font-display text-lg font-semibold tabular-nums">
                            {formatINR(h.value)}
                          </div>
                        </div>
                        <div className="min-w-0 text-right">
                          <div
                            className={cn(
                              "truncate text-sm font-semibold tabular-nums",
                              h.gain >= 0 ? "text-primary" : "text-destructive",
                            )}
                          >
                            {signedINR(h.gain)}
                          </div>
                          <div className="text-xs tabular-nums text-muted-foreground">
                            {pct(h.gainPct)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="tabular-nums">Invested {formatINR(h.invested)}</span>
                        {h.units ? <span className="tabular-nums">{h.units} units</span> : null}
                        {h.avgCost ? (
                          <span className="tabular-nums">avg \u20b9{h.avgCost.toFixed(2)}</span>
                        ) : null}
                        <Badge variant="outline" className="text-[10px]">
                          {h.className}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}