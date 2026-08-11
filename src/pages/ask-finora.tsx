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
  error?: string;
};

/** Renders the model's light markdown (**bold**, - bullets) as plain elements. */
function Answer({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        const isList = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="space-y-1.5 pl-4">
              {lines.map((l, j) => (
                <li key={j} className="list-disc marker:text-muted-foreground">
                  <Inline text={l.replace(/^\s*([-*•]|\d+\.)\s+/, "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Inline text={block.replace(/\n/g, " ")} />
          </p>
        );
      })}
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

  async function send(text: string) {
    const q = text.trim();
    if (!q || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setQuestion("");
    const id = `${Date.now()}`;
    setTurns((prev) => [...prev, { id, question: q }]);
    try {
      const res = await ask({ data: { question: q } });
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, answer: res.answer, projections: res.projections } : t)),
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
          {SUGGESTIONS.map((s) => (
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
