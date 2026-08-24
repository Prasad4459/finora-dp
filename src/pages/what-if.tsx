import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Car,
  LineChart,
  Scale,
  AlertTriangle,
  Info,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WidgetError } from "@/components/finance/widget-state";
import {
  ScenarioPicker,
  ScenarioTabs,
  type ScenarioOption,
} from "@/components/finance/what-if/scenario-picker";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useScenarioSnapshot } from "@/hooks/use-scenario-snapshot";
import {
  PROJECTION_YEARS,
  compareScenarios,
  emiFor,
  runInvestMoreScenario,
  runInvestVsPrepayScenario,
  runNewEmiScenario,
  type ProjectionYears,
  type ScenarioResult,
} from "@/services/scenario-engine";

type ScenarioKey = "emi" | "invest" | "prepay";

const SCENARIOS: ReadonlyArray<ScenarioOption<ScenarioKey>> = [
  {
    key: "emi",
    title: "New EMI",
    icon: Car,
    question: "Can I afford this loan?",
    blurb: "See what a new loan would do to your monthly cash flow, debt and goals.",
  },
  {
    key: "invest",
    title: "Increase Investment",
    icon: LineChart,
    question: "What if I invest more?",
    blurb: "Project what investing more each month could be worth over time.",
  },
  {
    key: "prepay",
    title: "Invest vs Prepay Debt",
    icon: Scale,
    question: "Prepay or invest?",
    blurb: "Compare paying down a loan against investing the same money.",
  },
];

const num = (v: string) => {
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatINR(Math.abs(n))}`;

export function WhatIf() {
  const { snapshot, isLoading, isError, refetch, current } = useScenarioSnapshot();
  const [active, setActive] = useState<ScenarioKey | null>(null);
  const [years, setYears] = useState<ProjectionYears>(5);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  // Scenario A inputs
  const [purchase, setPurchase] = useState("800000");
  const [down, setDown] = useState("100000");
  const [rate, setRate] = useState("9");
  const [tenure, setTenure] = useState("60");
  const [emi, setEmi] = useState("");

  // Scenario B inputs
  const [extraMonthly, setExtraMonthly] = useState("10000");

  // Scenario C inputs
  const [liabilityId, setLiabilityId] = useState<string>("");
  const [lumpSum, setLumpSum] = useState("200000");

  const [expectedReturn, setExpectedReturn] = useState("10");

  const suggestedEmi = useMemo(
    () => emiFor(Math.max(0, num(purchase) - num(down)), num(rate), num(tenure)),
    [purchase, down, rate, tenure],
  );

  function reset(key: ScenarioKey | null) {
    setActive(key);
    setResult(null);
    if (key === "prepay" && !liabilityId && snapshot.liabilities[0]) {
      setLiabilityId(snapshot.liabilities[0].id);
    }
  }

  function run() {
    if (active === "emi") {
      setResult(
        runNewEmiScenario(
          snapshot,
          {
            purchaseAmount: num(purchase),
            downPayment: num(down),
            emi: emi ? num(emi) : suggestedEmi,
            annualRate: num(rate),
            tenureMonths: num(tenure),
            years,
            expectedReturn: num(expectedReturn),
          },
          current,
        ),
      );
    } else if (active === "invest") {
      setResult(
        runInvestMoreScenario(
          snapshot,
          { additionalMonthly: num(extraMonthly), expectedReturn: num(expectedReturn), years },
          current,
        ),
      );
    } else if (active === "prepay") {
      setResult(
        runInvestVsPrepayScenario(
          snapshot,
          { liabilityId, amount: num(lumpSum), expectedReturn: num(expectedReturn), years },
          current,
        ),
      );
    }
  }

  const missing = missingData(active, snapshot);
  const activeScenario = SCENARIOS.find((s) => s.key === active);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="What If?"
        description="Test a financial decision against your real numbers before you make it. Every projection is read-only — nothing here changes your accounts, loans, goals or transactions."
        actions={
          active ? (
            <Button size="sm" variant="outline" onClick={() => reset(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> All scenarios
            </Button>
          ) : undefined
        }
      />

      {/* Current situation — the baseline every scenario is compared against. */}
      <Card className="mb-6 border-border/70">
        <CardContent className="p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current situation
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Your position today, before any hypothetical change.
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              Baseline
            </Badge>
          </div>

          {isError ? (
            <WidgetError
              className="mt-2"
              message="Couldn't load your financial summary, so projections can't be calculated."
              onRetry={refetch}
            />
          ) : (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Figure label="Net worth" value={formatINR(snapshot.netWorth)} loading={isLoading} />
                <Figure
                  label="Avg monthly surplus"
                  value={formatINR(snapshot.monthlySurplus)}
                  loading={isLoading}
                  tone={snapshot.monthlySurplus < 0 ? "negative" : "neutral"}
                />
                <Figure
                  label="Total debt"
                  value={formatINR(snapshot.totalDebt)}
                  loading={isLoading}
                />
                <Figure
                  label="Invested capital"
                  value={formatINR(snapshot.totalInvestments)}
                  loading={isLoading}
                />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Monthly figures are averages of your last {snapshot.monthsOfHistory || 0} month
                {snapshot.monthsOfHistory === 1 ? "" : "s"} of recorded activity.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {!active && (
        <>
          <h2 className="mb-3 text-sm font-semibold">Choose a decision to explore</h2>
          <ScenarioPicker options={SCENARIOS} active={active} onSelect={reset} />
        </>
      )}

      {active && (
        <>
          <ScenarioTabs options={SCENARIOS} active={active} onSelect={reset} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <Card className="h-fit border-border/70">
              <CardContent className="space-y-5 p-5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{activeScenario?.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {activeScenario?.blurb}
                  </p>
                </div>

                {missing.length > 0 ? (
                  <div className="rounded-lg border border-border/70 bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
                    {missing.map((m) => (
                      <p key={m}>{m}</p>
                    ))}
                  </div>
                ) : (
                  <>
                    <Group title="The decision">
                      {active === "emi" && (
                        <>
                          <Field
                            label="Purchase / loan amount (₹)"
                            value={purchase}
                            onChange={setPurchase}
                          />
                          <Field label="Down payment (₹)" value={down} onChange={setDown} />
                          <Field label="Interest rate (% per year)" value={rate} onChange={setRate} />
                          <Field label="Tenure (months)" value={tenure} onChange={setTenure} />
                          <div className="space-y-1.5">
                            <Label className="text-xs">EMI (₹ per month)</Label>
                            <Input
                              inputMode="decimal"
                              value={emi}
                              placeholder={String(Math.round(suggestedEmi))}
                              onChange={(e) => setEmi(e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Leave blank to use the calculated EMI of {formatINR(suggestedEmi)}.
                            </p>
                          </div>
                        </>
                      )}

                      {active === "invest" && (
                        <>
                          <Field
                            label="Additional monthly investment (₹)"
                            value={extraMonthly}
                            onChange={setExtraMonthly}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            You currently invest about {formatINR(snapshot.monthlyInvestment)} per
                            month.
                          </p>
                        </>
                      )}

                      {active === "prepay" && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Liability</Label>
                            <Select value={liabilityId} onValueChange={setLiabilityId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a loan" />
                              </SelectTrigger>
                              <SelectContent>
                                {snapshot.liabilities.map((l) => (
                                  <SelectItem key={l.id} value={l.id}>
                                    {l.name} — {formatINR(l.balance)} @ {l.rate}%
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Field label="One-time amount (₹)" value={lumpSum} onChange={setLumpSum} />
                        </>
                      )}
                    </Group>

                    <Separator />

                    <Group title="Assumptions">
                      <Field
                        label={
                          active === "emi"
                            ? "Assumed investment return (%)"
                            : "Expected annual return (%)"
                        }
                        value={expectedReturn}
                        onChange={setExpectedReturn}
                      />
                      <div className="space-y-1.5">
                        <Label className="text-xs">Projection period</Label>
                        <div className="flex flex-wrap gap-2">
                          {PROJECTION_YEARS.map((y) => (
                            <Button
                              key={y}
                              type="button"
                              size="sm"
                              variant={years === y ? "default" : "outline"}
                              onClick={() => {
                                setYears(y);
                                setResult(null);
                              }}
                            >
                              {y}y
                            </Button>
                          ))}
                        </div>
                      </div>
                    </Group>

                    <Button className="w-full" onClick={run} disabled={isLoading || isError}>
                      <Sparkles className="mr-1.5 h-4 w-4" /> Run scenario
                    </Button>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      This is a projection only. Nothing is saved and none of your accounts,
                      investments, loans, goals or transactions are changed.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="min-w-0 space-y-6">
              {!result ? (
                <Card className="border-dashed border-border/70 bg-muted/20">
                  <CardContent className="p-10 text-center">
                    <p className="text-sm font-medium">
                      {missing.length > 0
                        ? "This scenario needs a little more data"
                        : "No projection yet"}
                    </p>
                    <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      {missing.length > 0
                        ? "Add the missing information above and this comparison will become available."
                        : "Set your assumptions on the left, then run the scenario to compare your current path with this decision."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Results result={result} years={years} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Results({ result, years }: { result: ScenarioResult; years: ProjectionYears }) {
  const diff = compareScenarios(result.current, result.scenario);
  const surplusNegative = result.scenario.cashFlow.surplus < 0;

  return (
    <>
      {/* Projected outcome — the headline financial impact. */}
      <Card className="border-border/70">
        <CardContent className="p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Projected outcome
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {result.current.label} vs {result.scenario.label}, over {years} year
                {years === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Projection
            </Badge>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Delta
              label={`Net worth in ${years}y`}
              value={signed(diff.netWorthDelta)}
              good={diff.netWorthDelta >= 0}
              hint={formatINR(result.scenario.netWorth.netWorth)}
            />
            <Delta
              label="Monthly surplus"
              value={signed(diff.surplusDelta)}
              good={diff.surplusDelta >= 0}
              hint={`${formatINR(result.scenario.cashFlow.surplus)} left each month`}
            />
            <Delta
              label={`Debt in ${years}y`}
              value={signed(diff.debtDelta)}
              good={diff.debtDelta <= 0}
              hint={formatINR(result.scenario.netWorth.debt)}
            />
          </div>

          {surplusNegative && (
            <div className="mt-4 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs leading-relaxed">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <span>
                This decision puts your monthly cash flow into shortfall — you would spend more than
                you bring in each month.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {result.warnings.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-2 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-destructive">
              Before you decide
            </div>
            {result.warnings.map((w) => (
              <div key={w} className="flex gap-2 text-xs leading-relaxed text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Side-by-side path comparison. */}
      <Card className="border-border/70">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border/70 px-5 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current path
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wide text-primary">
              {result.scenario.label}
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/70 bg-muted/30 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Measure</span>
            <span className="text-right">{result.current.label}</span>
            <span className="text-right">{result.scenario.label}</span>
          </div>
          {result.rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-2 border-b border-border/50 px-5 py-3 last:border-0"
            >
              <span className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                {r.label}
              </span>
              <span className="truncate text-right text-xs tabular-nums text-muted-foreground">
                {r.current}
              </span>
              <span className="min-w-0 text-right">
                <span className="block truncate text-sm font-semibold tabular-nums">
                  {r.scenario}
                </span>
                {r.delta !== undefined && r.delta !== 0 && (
                  <span
                    className={cn(
                      "block text-[11px] tabular-nums",
                      (r.higherIsBetter ?? true) === r.delta > 0
                        ? "text-primary"
                        : "text-destructive",
                    )}
                  >
                    {signed(r.delta)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What this means
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed">
            {result.keyImpacts.map((k) => (
              <li key={k} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0">{k}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Goal impact
          </div>
          {result.goals.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              You have no goals yet, so there is no goal timeline to compare.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {result.goals.map((g) => (
                <div key={g.goalId} className="rounded-lg border border-border/60 p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        Now: {g.currentLabel ?? "—"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Scenario: {g.scenarioLabel ?? "—"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{g.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Assumptions
          </div>
          <dl className="mt-3 divide-y divide-border/50">
            {result.assumptions.map((a) => (
              <div key={a.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-xs">
                <dt className="min-w-0 text-muted-foreground">{a.label}</dt>
                <dd className="text-right font-medium">{a.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex gap-2 rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              These are projections based on the assumptions above. Investment returns are estimated
              and are not guaranteed. Income, expenses and other assets are held flat for the whole
              projection period.
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Delta({
  label,
  value,
  hint,
  good,
}: {
  label: string;
  value: string;
  hint: string;
  good: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 p-3">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-xl",
          good ? "text-primary" : "text-destructive",
        )}
      >
        {value}
      </div>
      <div className="truncate text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Figure({
  label,
  value,
  loading,
  tone = "neutral",
}: {
  label: string;
  value: string;
  loading: boolean;
  tone?: "neutral" | "negative";
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
      ) : (
        <div
          className={cn(
            "mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-xl",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </div>
      )}
    </div>
  );
}

/** Human explanation of what the user still needs before a scenario is useful. */
function missingData(
  active: ScenarioKey | null,
  s: ReturnType<typeof useScenarioSnapshot>["snapshot"],
): string[] {
  if (!active) return [];
  const out: string[] = [];
  if (active === "prepay" && s.liabilities.length === 0) {
    out.push("You need at least one liability to compare debt prepayment.");
  }
  if (s.monthlyIncome === 0 && s.monthlyExpenses === 0) {
    out.push(
      "You need some recorded income and expenses before monthly cash flow and goal timelines can be projected.",
    );
  }
  return out;
}
