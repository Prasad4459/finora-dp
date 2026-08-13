// Presentation only — every figure comes from services/portfolio.
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Portfolio } from "@/services/portfolio";

const CLASS_TONE: Record<string, string> = {
  equity: "var(--chart-1)",
  debt: "var(--chart-2)",
  small_savings: "var(--chart-3)",
  gold: "var(--chart-4)",
  alternative: "var(--chart-5)",
  physical: "var(--muted-foreground)",
  cash: "var(--muted-foreground)",
};

export const sliceColor = (key: string) => CLASS_TONE[key] ?? "var(--muted-foreground)";

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-xl",
          tone === "positive" && "text-primary",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </div>
      {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function PortfolioHero({
  portfolio,
  monthlyOutflow,
  isLoading,
  isError,
  onRetry,
  onAdd,
}: {
  portfolio: Portfolio;
  monthlyOutflow: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAdd: () => void;
}) {
  const p = portfolio;
  const positive = p.gain >= 0;
  const hasHoldings = p.holdings.length > 0;

  return (
    <Card className="border-border/70">
      <CardContent className="p-5 sm:p-6">
        {isError ? (
          <WidgetError message="Couldn't load your portfolio." onRetry={onRetry} />
        ) : isLoading ? (
          <WidgetSkeleton lines={5} />
        ) : !hasHoldings ? (
          <WidgetEmpty
            message="No investments yet. Add your first mutual fund, stock, FD or PPF account to see portfolio value, allocation and gains."
            actionLabel="Add investment"
            onAction={onAdd}
            className="py-2"
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Portfolio value
              </div>
              <div className="mt-1 break-words font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                {formatINR(p.value)}
              </div>
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                )}
              >
                {positive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {positive ? "+" : "\u2212"}
                {formatINR(Math.abs(p.gain))} ({positive ? "+" : "\u2212"}
                {Math.abs(p.gainPct).toFixed(1)}%) unrealised
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border/70 pt-5 sm:grid-cols-3">
                <Metric
                  label="Invested"
                  value={formatINR(p.invested)}
                  hint={`${p.holdings.length} holding${p.holdings.length === 1 ? "" : "s"}`}
                />
                <Metric
                  label="Unrealised gain"
                  value={`${positive ? "+" : "\u2212"}${formatINR(Math.abs(p.gain))}`}
                  hint="Value − invested cost"
                  tone={positive ? "positive" : "negative"}
                />
                <Metric
                  label="Monthly contributions"
                  value={formatINR(monthlyOutflow)}
                  hint={monthlyOutflow > 0 ? "SIP / recurring" : "None scheduled"}
                />
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Allocation</div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {p.allocation.length} class{p.allocation.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {p.allocation.map((s) => (
                  <span
                    key={s.key}
                    className="h-full"
                    style={{ width: `${s.pct}%`, background: sliceColor(s.key) }}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-2">
                {p.allocation.map((s) => (
                  <li key={s.key} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: sliceColor(s.key) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {s.pct.toFixed(1)}%
                    </span>
                    <span className="w-24 shrink-0 text-right tabular-nums">
                      {formatINR(s.value)}
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={onAdd}>
                Add investment
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}