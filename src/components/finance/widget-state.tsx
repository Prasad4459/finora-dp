import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Placeholder shown while a widget's own query is in flight. */
export function WidgetSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

/**
 * Shown instead of financial values when a query fails — a failed load must
 * never be rendered as ₹0.
 */
export function WidgetError({
  message = "Couldn't load this data.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-2 py-4 text-sm", className)} role="alert">
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

/** Genuinely empty (new user) — distinct from loading and from failure. */
export function WidgetEmpty({
  message,
  className,
  actionLabel,
  onAction,
}: {
  message: string;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!actionLabel || !onAction) {
    return <p className={cn("py-4 text-sm text-muted-foreground", className)}>{message}</p>;
  }
  return (
    <div className={cn("flex flex-col items-start gap-3 py-4", className)}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}