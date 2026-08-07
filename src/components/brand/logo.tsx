import { cn } from "@/lib/utils";

/**
 * Finora wordmark — text-based, premium, works in light and dark mode.
 */
export function FinoraLogo({
  className,
  size = "md",
  markOnly = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  markOnly?: boolean;
}) {
  const markSize = size === "lg" ? "h-10 w-10 text-lg" : size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-base";
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-border/50",
          markSize,
        )}
      >
        <span className="brand-wordmark leading-none">F</span>
      </div>
      {!markOnly && (
        <span className={cn("brand-wordmark leading-none", textSize)}>
          Finora<span className="text-primary">.</span>
        </span>
      )}
    </div>
  );
}