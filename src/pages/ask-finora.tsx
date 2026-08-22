import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CircleAlert,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askFinora } from "@/lib/ask-finora.functions";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "How much did my mutual funds gain?",
  "Why did my net worth change?",
  "What changed in my portfolio?",
  "How much did I earn today?",
];

type Turn = {
  id: string;
  question: string;
  answer?: string;
  projections?: string[];
  followUps?: string[];
  error?: string;
};

const SECTIONS = [
  "SUMMARY",
  "YOUR NUMBERS",
  "IMPACT",
  "EXPLANATION",
  "MARKET CHANGE",
  "TRANSACTION CHANGE",
  "RECONCILIATION",
  "OPTIONS",
  "PROJECTED IMPACT",
  "TRADE-OFF",
  "TRADE OFF",
  "RECOMMENDATION",
  "ASSUMPTIONS",
];

const KIND_STYLE: Record<string, { label: string; badge: string; wrap: string }> = {
  FACT: {
    label: "Fact",
    badge: "border-border bg-muted text-foreground/80",
    wrap: "border-border",
  },
  "MARKET CHANGE": {
    label: "Market change",
    badge: "border-highlight/25 bg-highlight/10 text-highlight",
    wrap: "border-highlight/40",
  },
  "UNREALISED GAIN": {
    label: "Unrealised gain",
    badge: "border-success/25 bg-success/10 text-success",
    wrap: "border-success/40",
  },
  TRANSACTION: {
    label: "Transaction",
    badge: "border-border bg-secondary text-secondary-foreground",
    wrap: "border-foreground/30",
  },
  PROJECTION: {
    label: "Projection",
    badge: "border-primary/25 bg-primary/10 text-primary",
    wrap: "border-primary/40",
  },
  ASSUMPTION: {
    label: "Assumption",
    badge: "border-muted-foreground/30 bg-background text-muted-foreground",
    wrap: "border-dashed border-muted-foreground/40",
  },
  RECOMMENDATION: {
    label: "Recommendation",
    badge: "border-success/30 bg-success/10 text-success",
    wrap: "border-success/50",
  },
};

type Line = { kind: keyof typeof KIND_STYLE | null; text: string };
type Section = { heading: string | null; lines: Line[] };

const cleanHeading = (raw: string) => (raw === "TRADE OFF" ? "TRADE-OFF" : raw);

function parseAnswer(text: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, lines: [] };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bare = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/:$/, "").trim();
    if (SECTIONS.includes(bare.toUpperCase())) {
      if (current.lines.length) sections.push(current);
      current = { heading: cleanHeading(bare.toUpperCase()), lines: [] };
      continue;
    }
    const body = line.replace(/^\s*([-*•]|\d+\.)\s+/, "");
    const match =
      /^\**(MARKET CHANGE|UNREALIS[EZ]D GAIN|TRANSACTION|FACT|PROJECTION|ASSUMPTION|RECOMMENDATION)\**\s*[:—-]\s*(.*)$/i.exec(
        body,
      );
    current.lines.push(
      match
        ? {
            kind: match[1].toUpperCase().replace("UNREALIZED", "UNREALISED") as keyof typeof KIND_STYLE,
            text: match[2],
          }
        : { kind: null, text: body },
    );
  }
  if (current.lines.length) sections.push(current);
  return sections;
}

/** Renders the assistant's structured answer with fact/projection/assumption cues. */
function Answer({ text }: { text: string }) {
  const sections = parseAnswer(text);
  return (
    <div className="space-y-7 text-[15px] leading-7">
      {sections.map((section, i) => (
        <section key={i} className="space-y-3">
          {section.heading && (
            <h3 className="border-b border-border pb-2 font-display text-xs font-semibold uppercase text-muted-foreground">
              {section.heading}
            </h3>
          )}
          {section.lines.map((line, j) =>
            line.kind ? (
              <div
                key={j}
                className={cn(
                  "grid min-w-0 gap-2 border-l-2 py-1 pl-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4 sm:pl-4",
                  KIND_STYLE[line.kind].wrap,
                )}
              >
                <span
                  className={cn(
                    "h-fit w-fit rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    KIND_STYLE[line.kind].badge,
                  )}
                >
                  {KIND_STYLE[line.kind].label}
                </span>
                <span className="min-w-0 text-foreground/90">
                  <Inline text={line.text} />
                </span>
              </div>
            ) : (
              <p key={j} className="text-foreground/90">
                <Inline text={line.text} />
              </p>
            ),
          )}
        </section>
      ))}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|[+-]?₹[\d,.]+(?:\s*(?:L|Cr|lakh|crore))?|[+-]?\d+(?:\.\d+)?%)/gi);
  return (
    <>
      {parts.map((part, i) => {
        const isMarkdownStrong = part.startsWith("**") && part.endsWith("**");
        const isFigure = /^[+-]?(?:₹|\d).*(?:%|\d|L|Cr|lakh|crore)$/i.test(part);
        return isMarkdownStrong || isFigure ? (
          <strong key={i} className="font-display font-semibold tabular-nums text-foreground">
            {isMarkdownStrong ? part.slice(2, -2) : part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

export function AskFinora() {
  const ask = useServerFn(askFinora);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const lastTurn = turns.filter((t) => t.answer).slice(-1)[0];
  const nextSuggestions = lastTurn?.followUps?.length ? lastTurn.followUps : SUGGESTIONS;

  async function send(text: string) {
    const q = text.trim();
    if (!q || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setQuestion("");
    const id = `${Date.now()}`;
    // Session-only memory: the last two answered turns travel with the request.
    const history = turns
      .filter((t) => t.answer)
      .slice(-2)
      .map((t) => ({ question: t.question, answer: t.answer as string }));
    setTurns((prev) => [...prev, { id, question: q }]);
    try {
      const res = await ask({ data: { question: q, history } });
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, answer: res.answer, projections: res.projections, followUps: res.followUps } : t,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Ask Finora is unavailable right now. Please try again.";
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, error: message } : t)));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden">
      <PageHeader title="Ask Finora" description="Clarity for the financial decisions in front of you." />

      <section className="border-y border-border bg-card px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-success" />
          What would you like to understand?
        </div>
        <form
          className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(question);
          }}
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your money…"
            maxLength={500}
            disabled={pending}
            aria-label="Ask Finora a question"
            className="h-12 min-w-0 border-border bg-background px-4 text-base shadow-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || !question.trim()}
            aria-label="Ask Finora"
            title="Ask Finora"
            className="h-12 w-12"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
        <div className="mt-4 grid gap-1 sm:grid-cols-2">
          {(turns.length > 0 ? nextSuggestions : SUGGESTIONS).map((suggestion) => (
            <Button
              key={suggestion}
              variant="ghost"
              size="sm"
              onClick={() => send(suggestion)}
              disabled={pending}
              className="h-auto min-w-0 justify-between whitespace-normal px-2 py-2 text-left text-muted-foreground"
            >
              <span className="min-w-0">{suggestion}</span>
              <ArrowRight className="shrink-0" />
            </Button>
          ))}
        </div>
      </section>

      {turns.length === 0 && (
        <div className="grid gap-6 border-b border-border py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="max-w-2xl">
            <p className="font-display text-xl font-semibold">Your numbers, explained in context.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Answers separate recorded activity, market movement and modelled outcomes, so you can see
              what happened, what it means and what remains uncertain.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/what-if">
              <BarChart3 />
              Explore What If?
            </Link>
          </Button>
        </div>
      )}

      <div className="divide-y divide-border">
        {turns.map((turn) => (
          <article key={turn.id} className="py-8 sm:py-10">
            <div className="grid gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Your question</p>
              <h2 className="min-w-0 font-display text-xl font-semibold leading-snug sm:text-2xl">
                {turn.question}
              </h2>
            </div>

            {turn.error ? (
              <div className="mt-6 border-l-2 border-destructive/60 bg-destructive/5 px-4 py-4 sm:ml-[9rem]">
                <div className="flex items-start gap-3">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">This answer isn&apos;t available yet</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{turn.error}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={() => send(turn.question)} disabled={pending}>
                      Try again
                    </Button>
                  </div>
                </div>
              </div>
            ) : turn.answer ? (
              <div className="mt-7 grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6">
                <div className="flex items-center gap-2 self-start text-[11px] font-semibold uppercase text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5 text-success" />
                  Finora
                </div>
                <div className="min-w-0">
                  <Answer text={turn.answer} />
                  {turn.projections && turn.projections.length > 0 && (
                    <div className="mt-7 flex flex-col gap-3 border-t border-border pt-4 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <p>Modelled by What If?: {turn.projections.join("; ")}.</p>
                      <Button variant="ghost" size="sm" asChild className="w-fit">
                        <Link to="/what-if">
                          Explore scenario <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-7 grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6" aria-live="polite">
                <div className="flex items-center gap-2 self-start text-[11px] font-semibold uppercase text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-success" />
                  Finora
                </div>
                <div className="space-y-3 pt-1">
                  <p className="text-sm text-muted-foreground">Reading your financial picture…</p>
                  <div className="h-3 w-full max-w-xl animate-pulse rounded bg-muted" />
                  <div className="h-3 w-4/5 max-w-lg animate-pulse rounded bg-muted" />
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      <p className="border-t border-border py-6 text-xs leading-relaxed text-muted-foreground">
        Ask Finora provides educational insights and projections based on your financial information.
        Projections are estimates, not guarantees, and this is not regulated financial advice.
      </p>
    </div>
  );
}
