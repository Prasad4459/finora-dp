// Presentation only — no scenario logic lives here.
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScenarioOption<K extends string> = {
  key: K;
  title: string;
  icon: LucideIcon;
  blurb: string;
  question: string;
};

export function ScenarioPicker<K extends string>({
  options,
  active,
  onSelect,
}: {
  options: ReadonlyArray<ScenarioOption<K>>;
  active: K | null;
  onSelect: (key: K) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {options.map((s) => {
        const isActive = active === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s.key)}
            aria-pressed={isActive}
            className={cn(
              "group min-w-0 rounded-xl border border-border/70 bg-card p-5 text-left transition",
              "hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "border-primary/60 ring-1 ring-primary/20",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{s.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.question}</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}

/** Compact horizontal switcher used once a scenario is open. */
export function ScenarioTabs<K extends string>({
  options,
  active,
  onSelect,
}: {
  options: ReadonlyArray<ScenarioOption<K>>;
  active: K | null;
  onSelect: (key: K) => void;
}) {
  return (
    <div className="-mx-1 mb-6 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onSelect(s.key)}
          aria-pressed={active === s.key}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
            active === s.key
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground",
          )}
        >
          {s.title}
        </button>
      ))}
    </div>
  );
}
