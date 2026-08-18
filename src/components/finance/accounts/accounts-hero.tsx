// Presentation only — every figure is computed by the Accounts page.
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export type AccountsHeroSlice = { label: string; amount: number; className: string };

export function AccountsHero({
  available,
  outstanding,
  netPosition,
  accountCount,
  cashCount,
  creditCount,
  investmentCount,
  slices,
  isLoading,
  isError,
  onRetry,
  onAdd,
}: {
  available: number;
  outstanding: number;
  netPosition: number;
  accountCount: number;
  cashCount: number;
  creditCount: number;
  investmentCount: number;
  slices: AccountsHeroSlice[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAdd: () => void;
}) {
  const sliceTotal = slices.reduce((s, x) => s + x.amount, 0);

  return (
    <Card className="border-border/70">
      <CardContent className="p-5 sm:p-6">
        {isError ? (
          <WidgetError message="Couldn't load your accounts." onRetry={onRetry} />
        ) : isLoading ? (
          <WidgetSkeleton lines={5} />
        ) : accountCount === 0 ? (
          <WidgetEmpty
            message="No accounts yet. Add your bank, cash and UPI wallets so every transaction has a home."
            actionLabel="Add your first account"
            onAction={onAdd}
          />
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Available balance
                </div>
                <div className="mt-1 break-words font-display text-3xl font-semibold tabular-nums sm:text-4xl">
                  {formatINR(available)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  across {accountCount} {accountCount === 1 ? "account" : "accounts"}
                  {outstanding > 0 ? ` · ${formatINR(outstanding)} owed on cards & loans` : ""}
                </div>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            {sliceTotal > 0 && (
              <div className="mt-4">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  {slices
                    .filter((s) => s.amount > 0)
                    .map((s) => (
                      <div
                        key={s.label}
                        className={s.className}
                        style={{ width: `${(s.amount / sliceTotal) * 100}%` }}
                        title={`${s.label} · ${formatINR(s.amount)}`}
                      />
                    ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {slices
                    .filter((s) => s.amount > 0)
                    .map((s) => (
                      <span key={s.label} className="inline-flex min-w-0 items-center gap-1.5">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", s.className)} />
                        <span className="truncate">{s.label}</span>
                        <span className="tabular-nums">{formatINR(s.amount)}</span>
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border/60 pt-4 sm:grid-cols-4">
              <Metric
                label="Net position"
                value={formatINR(netPosition)}
                hint="Balances minus what you owe"
                tone={netPosition < 0 ? "negative" : "positive"}
              />
              <Metric label="Cash accounts" value={String(cashCount)} hint="Bank, cash & UPI" />
              <Metric
                label="Cards & loans"
                value={String(creditCount)}
                hint={outstanding > 0 ? `${formatINR(outstanding)} outstanding` : "Nothing outstanding"}
                tone={outstanding > 0 ? "negative" : "neutral"}
              />
              <Metric
                label="Investment accounts"
                value={String(investmentCount)}
                hint="Linked to holdings"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
