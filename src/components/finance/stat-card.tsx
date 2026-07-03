import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</div>
            {delta && (
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
