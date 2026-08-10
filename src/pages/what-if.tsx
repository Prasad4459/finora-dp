import { useMemo, useState } from "react";
import { ArrowLeft, Car, LineChart, Scale, AlertTriangle, Info, Sparkles } from "lucide-react";
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
import { formatINR } from "@/lib/format";
import { useScenarioSnapshot } from "@/hooks/use-scenario-snapshot";
import {
  PROJECTION_YEARS,
  emiFor,
  runInvestMoreScenario,
  runInvestVsPrepayScenario,
  runNewEmiScenario,
  type ProjectionYears,
  type ScenarioResult,
} from "@/services/scenario-engine";

type ScenarioKey = "emi" | "invest" | "prepay";

const SCENARIOS = [
  {
    key: "emi" as const,
    title: "New EMI",
    icon: Car,
    blurb: "See what a new loan would do to your monthly cash flow, debt and goals.",
  },
  {
    key: "invest" as const,
    title: "Increase Investment",
    icon: LineChart,
    blurb: "Project what investing more each month could be worth over time.",
  },
  {
    key: "prepay" as const,
    title: "Invest vs Prepay Debt",
    icon: Scale,
    blurb: "Compare paying down a loan against investing the same money.",
  },
];

const num = (v: string) => {
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

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

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="What If?"
        description="Explore how a financial decision could affect your future. Nothing here changes your real data."
        actions={
          active ? (
            <Button size="sm" variant="outline" onClick={() => reset(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> All scenarios
            </Button>
          ) : undefined
        }
      />

      {isError && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="flex items-center justify-between gap-4 p-5 text-sm">
            <span className="text-muted-foreground">
              Couldn&apos;t load your financial summary, so projections can&apos;t be calculated.
            </span>
            <Button size="sm" variant="outline" onClick={refetch}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!active && (
        <div className="grid gap-4 md:grid-cols-3">
          {SCENARIOS.map((s) => (
            <Card
              key={s.key}
              className="cursor-pointer border-border/70 transition hover:-translate-y-0.5 hover:border-primary/40"
              onClick={() => reset(s.key)}
            >
              <CardContent className="p-5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-semibold">{s.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!active && (
        <Card className="mt-6 border-border/70">
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your starting point
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Figure label="Net worth" value={formatINR(snapshot.netWorth)} loading={isLoading} />
              <Figure
                label="Avg monthly surplus"
                value={formatINR(snapshot.monthlySurplus)}
                loading={isLoading}
              />
              <Figure label="Total debt" value={formatINR(snapshot.totalDebt)} loading={isLoading} />
              <Figure
                label="Invested capital"
                value={formatINR(snapshot.totalInvestments)}
                loading={isLoading}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Monthly figures are averages of your last {snapshot.monthsOfHistory || 0} month
              {snapshot.monthsOfHistory === 1 ? "" : "s"} of recorded activity.
            </p>
          </CardContent>
        </Card>
      )}

      {active && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card className="border-border/70">
            <CardContent className="space-y-4 p-5">
              <div className="text-sm font-semibold">
                {SCENARIOS.find((s) => s.key === active)?.title}
              </div>

              {missing.length > 0 ? (
                <div className="rounded-lg border border-border/70 bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
                  {missing.map((m) => (
                    <p key={m}>{m}</p>
                  ))}
                </div>
              ) : (
                <>
                  {active === "emi" && (
                    <>
                      <Field label="Purchase / loan amount (₹)" value={purchase} onChange={setPurchase} />
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
                        You currently invest about {formatINR(snapshot.monthlyInvestment)} per month.
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

                  {active !== "emi" && (
                    <Field
                      label="Expected annual return (%)"
                      value={expectedReturn}
                      onChange={setExpectedReturn}
                    />
                  )}
                  {active === "emi" && (
                    <Field
                      label="Assumed investment return (%)"
                      value={expectedReturn}
                      onChange={setExpectedReturn}
                    />
                  )}

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
                          {y} year{y === 1 ? "" : "s"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />
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

          <div className="space-y-6">
            {!result ? (
              <Card className="border-border/70">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  {missing.length > 0
                    ? "Add the missing information to run this scenario."
                    : "Set your assumptions and run the scenario to see the comparison."}
                </CardContent>
              </Card>
            ) : (
              <Results result={result} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Results({ result }: { result: ScenarioResult }) {
  return (
    <>
      {result.warnings.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-2 p-5">
            {result.warnings.map((w) => (
              <div key={w} className="flex gap-2 text-xs leading-relaxed text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70">
        <CardContent className="p-0">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/70 px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span />
            <span>{result.current.label}</span>
            <span>{result.scenario.label}</span>
          </div>
          {result.rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 border-b border-border/50 px-5 py-3 text-sm last:border-0"
            >
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="tabular-nums">{r.current}</span>
              <span className="font-medium tabular-nums">{r.scenario}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Key impact
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed">
            {result.keyImpacts.map((k) => (
              <li key={k} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{k}</span>
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{g.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        Current: {g.currentLabel ?? "—"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Scenario: {g.scenarioLabel ?? "—"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{g.message}</p>
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
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.assumptions.map((a) => (
              <div key={a.label} className="flex justify-between gap-3 text-xs">
                <dt className="text-muted-foreground">{a.label}</dt>
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

function Figure({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
      ) : (
        <div className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</div>
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