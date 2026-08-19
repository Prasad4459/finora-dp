// Marketing-only presentation of the real Finora product surfaces.
//
// These components render the SAME markup, tokens and typography as the
// in-app Dashboard, Ask Finora and Investments screens, driven by a small
// static sample so the public page needs no session, no queries and no
// financial logic. Every preview is labelled "Sample data".
import { ArrowUpRight, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SampleTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-muted-foreground/70" />
      Sample data
    </span>
  );
}

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
      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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

/** Chrome that frames a product surface without turning it into a device mockup. */
export function ProductFrame({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("border border-border bg-card shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <SampleTag className="shrink-0" />
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

/* ------------------------------- dashboard -------------------------------- */

const SPEND = [
  { label: "Housing", value: 42 },
  { label: "Food", value: 21 },
  { label: "Transport", value: 14 },
  { label: "Everything else", value: 23 },
];

const ACTIVITY = [
  { name: "Salary credit", meta: "HDFC Salary · 01/08", amount: 186000, positive: true },
  { name: "SIP — Parag Parikh Flexi Cap", meta: "Investments · 05/08", amount: -25000, positive: false },
  { name: "Rent", meta: "Housing · 05/08", amount: -46000, positive: false },
  { name: "Electricity bill", meta: "Bills · 08/08", amount: -3120, positive: false },
];

export function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Net worth
        </div>
        <div className="mt-1 break-words font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          {formatINR(4286400)}
        </div>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <ArrowUpRight className="h-3.5 w-3.5" />+{formatINR(112400)} this month
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border pt-5 sm:grid-cols-3">
          <Metric label="Available balance" value={formatINR(305200)} hint="4 accounts" />
          <Metric label="Portfolio value" value={formatINR(2184900)} hint="9 holdings" />
          <Metric
            label="Monthly surplus"
            value={formatINR(64300)}
            hint="34% savings rate"
            tone="positive"
          />
        </div>

        {!compact && (
          <div className="mt-6 border-t border-border pt-5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Where this month went
            </div>
            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
              {SPEND.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    width: `${s.value}%`,
                    background: `var(--chart-${i + 1})`,
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {SPEND.map((s, i) => (
                <div key={s.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: `var(--chart-${i + 1})` }}
                  />
                  {s.label} <span className="tabular-nums text-foreground">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-5">
        <div className="border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Investments</div>
            <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="mt-3 truncate font-display text-2xl font-semibold tabular-nums">
            {formatINR(2184900)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Metric label="Invested" value={formatINR(1806000)} />
            <Metric
              label="Unrealised"
              value={`+${formatINR(378900)}`}
              hint="+21.0%"
              tone="positive"
            />
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Recent activity
          </div>
          <ul className="mt-2 divide-y divide-border border-t border-border">
            {ACTIVITY.slice(0, compact ? 3 : 4).map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.meta}</div>
                </div>
                <div
                  className={cn(
                    "shrink-0 text-sm font-medium tabular-nums",
                    a.positive ? "text-primary" : "text-foreground",
                  )}
                >
                  {a.positive ? "+" : "\u2212"}
                  {formatINR(Math.abs(a.amount))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ ask finora -------------------------------- */

export function AskFinoraExchange({
  question,
  answer,
  facts,
}: {
  question: string;
  answer: string;
  facts: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {question}
        </div>
      </div>
      <div className="border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
          Ask Finora
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
        <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {f.label}
              </dt>
              <dd className="mt-0.5 truncate font-display text-base font-semibold tabular-nums">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function AskFinoraPrompt() {
  return (
    <div className="flex items-center gap-2 border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <span className="truncate">Ask about your money…</span>
    </div>
  );
}

/* ------------------------------ investments ------------------------------- */

const ALLOCATION = [
  { label: "Equity", pct: 58, color: "var(--chart-1)" },
  { label: "Debt", pct: 19, color: "var(--chart-2)" },
  { label: "Small savings", pct: 14, color: "var(--chart-3)" },
  { label: "Gold", pct: 9, color: "var(--chart-4)" },
];

const HOLDINGS = [
  { name: "Parag Parikh Flexi Cap", meta: "Mutual fund · AMFI NAV", value: 742300, gain: 18.4 },
  { name: "Nifty 50 Index Fund", meta: "Mutual fund · AMFI NAV", value: 486100, gain: 12.9 },
  { name: "PPF", meta: "Small savings", value: 305800, gain: 7.1 },
  { name: "Sovereign Gold Bond", meta: "Gold · per gram", value: 196400, gain: 24.6 },
];

export function InvestmentsPreview() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Portfolio value
        </div>
        <div className="mt-1 break-words font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          {formatINR(2184900)}
        </div>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <TrendingUp className="h-3.5 w-3.5" />+{formatINR(378900)} (+21.0%) unrealised
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border pt-5 sm:grid-cols-3">
          <Metric label="Invested" value={formatINR(1806000)} hint="9 holdings" />
          <Metric
            label="Unrealised gain"
            value={`+${formatINR(378900)}`}
            hint="Value − invested cost"
            tone="positive"
          />
          <Metric label="Monthly SIPs" value={formatINR(41000)} hint="4 schedules" />
        </div>
        <div className="mt-5">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {ALLOCATION.map((a) => (
              <div key={a.label} style={{ width: `${a.pct}%`, background: a.color }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {ALLOCATION.map((a) => (
              <div key={a.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />
                {a.label} <span className="tabular-nums text-foreground">{a.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Holdings
        </div>
        <ul className="mt-2 divide-y divide-border border-t border-border">
          {HOLDINGS.map((h) => (
            <li key={h.name} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{h.name}</div>
                <div className="truncate text-xs text-muted-foreground">{h.meta}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-medium tabular-nums">{formatINR(h.value)}</div>
                <div className="text-xs tabular-nums text-primary">+{h.gain}%</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}