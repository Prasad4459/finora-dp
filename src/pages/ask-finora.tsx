import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { askFinora } from "@/lib/ask-finora.functions";

const SUGGESTIONS = [
  "How am I doing financially?",
  "Why did my net worth change?",
  "How can I reach ₹50L faster?",
  "Can I afford a ₹40,000 car EMI?",
  "Should I invest ₹2L or prepay my loan?",
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
    badge: "bg-muted text-foreground/80",
    wrap: "border-border bg-muted/30",
  },
  PROJECTION: {
    label: "Projection",
    badge: "bg-primary text-primary-foreground",
    wrap: "border-primary/25 bg-primary/[0.06]",
  },
  ASSUMPTION: {
    label: "Assumption",
    badge: "border border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground",
    wrap: "border-dashed border-border bg-transparent",
  },
  RECOMMENDATION: {
    label: "Recommendation",
    badge: "bg-success text-primary-foreground",
    wrap: "border-success/30 bg-success/[0.08]",
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
    const match = /^\**(FACT|PROJECTION|ASSUMPTION|RECOMMENDATION)\**\s*[:—-]\s*(.*)$/i.exec(body);
    current.lines.push(
      match
        ? { kind: match[1].toUpperCase() as keyof typeof KIND_STYLE, text: match[2] }
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
    <div className="space-y-4 text-sm leading-relaxed">
      {sections.map((section, i) => (
        <div key={i} className="space-y-2">
          {section.heading && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.heading}
            </p>
          )}
          {section.lines.map((line, j) =>
            line.kind ? (
              <div
                key={j}
                className={`flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3 ${KIND_STYLE[line.kind].wrap}`}
              >
                <span
                  className={`w-fit shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_STYLE[line.kind].badge}`}
                >
                  {KIND_STYLE[line.kind].label}
                </span>
                <span className="min-w-0">
                  <Inline text={line.text} />
                </span>
              </div>
            ) : (
              <p key={j} className={section.heading && section.heading !== "SUMMARY" ? "pl-1" : ""}>
                <Inline text={line.text} />
              </p>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
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
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Ask Finora" description="Your personal financial copilot." />

      {turns.length === 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              What would you like to know?
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask about your savings, spending, debt, goals or a decision you&apos;re weighing up. Answers
              use your own Finora data — nothing here changes it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)} disabled={pending}>
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                {turn.question}
              </div>
            </div>

            {turn.error ? (
              <Card className="border-destructive/40">
                <CardContent className="flex items-start gap-3 p-4 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="space-y-2">
                    <p className="text-muted-foreground">{turn.error}</p>
                    <Button size="sm" variant="outline" onClick={() => send(turn.question)} disabled={pending}>
                      Try again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : turn.answer ? (
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    Ask Finora
                  </div>
                  <Answer text={turn.answer} />
                  {turn.projections && turn.projections.length > 0 && (
                    <p className="border-t pt-3 text-xs text-muted-foreground">
                      Projections calculated by the{" "}
                      <Link to="/what-if" className="underline underline-offset-2">
                        What If?
                      </Link>{" "}
                      engine: {turn.projections.join("; ")}.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Working through your numbers…
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>

      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
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
        />
        <Button type="submit" disabled={pending || !question.trim()} className="sm:w-auto">
          {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
          Ask
        </Button>
      </form>

      {turns.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {nextSuggestions.map((s) => (
            <Button key={s} variant="ghost" size="sm" onClick={() => send(s)} disabled={pending}>
              {s}
            </Button>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Ask Finora provides educational insights and projections based on your financial information.
        Projections are estimates, not guarantees, and this is not regulated financial advice.
      </p>
    </div>
  );
}
