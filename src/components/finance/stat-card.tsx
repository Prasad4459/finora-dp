import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "neutral",
  state = "ready",
  onRetry,
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "positive" | "negative";
  /** Loading / failed states replace the figure — a failed load is never ₹0. */
  state?: "ready" | "loading" | "error";
  onRetry?: () => void;
}) {
  const failed = state === "error";
  const busy = state === "loading";
  return (
    <Card className="border-border/70 hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            {busy ? (
              <div className="mt-3 h-6 w-28 animate-pulse rounded bg-muted" />
            ) : (
              <div className="mt-2 truncate font-display text-2xl font-semibold tracking-tight tabular-nums">
                {failed ? "—" : value}
              </div>
            )}
            {failed ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 text-xs text-destructive underline-offset-2 hover:underline"
              >
                Couldn't load — retry
              </button>
            ) : (
              delta &&
              !busy && (
              <div
                className={cn(
                  "mt-1 text-xs",
                  tone === "positive" && "text-primary",
                  tone === "negative" && "text-destructive",
                  tone === "neutral" && "text-muted-foreground",
                )}
              >
                {delta}
              </div>
              )
            )}
          </div>
          {Icon && (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
