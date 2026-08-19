import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinoraLogo } from "@/components/brand/logo";
import {
  AskFinoraExchange,
  AskFinoraPrompt,
  DashboardPreview,
  InvestmentsPreview,
  ProductFrame,
} from "@/components/marketing/product-previews";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finora — Your Financial Life. Organized." },
      {
        name: "description",
        content:
          "Finora is a premium personal finance platform for income, expenses, investments, assets, liabilities, budgets, goals and bills.",
      },
      { property: "og:title", content: "Finora — Your Financial Life. Organized." },
      {
        property: "og:description",
        content:
          "Manage income, expenses, investments, budgets, goals and bills from one intelligent dashboard.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://money-os-budget.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://money-os-budget.lovable.app/" }],
  }),
  component: Landing,
});

const PILLARS = ["Cash", "Spending", "Investments", "Bills", "Goals", "Net worth"];

const FLOW = [
  { step: "Income", copy: "Salary and other credits land in your accounts." },
  { step: "Spending", copy: "Categorised automatically against your budgets." },
  { step: "Saving", copy: "What's left becomes your monthly surplus." },
  { step: "Investing", copy: "SIPs, funds, gold and small savings, priced daily." },
  { step: "Goals", copy: "Contributions move real goals towards their target." },
  { step: "Net worth", copy: "Every movement resolves into one honest number." },
];

const EXCHANGES = [
  {
    question: "How much did my mutual funds gain?",
    answer:
      "Your mutual funds are worth more than you invested in them. Finora compares each holding's latest NAV against its weighted average cost, so the gain shown is unrealised — nothing has been sold.",
    facts: [
      { label: "Current value", value: "₹12,28,400" },
      { label: "Invested", value: "₹10,42,000" },
      { label: "Unrealised gain", value: "+₹1,86,400" },
    ],
  },
  {
    question: "Why did my net worth change?",
    answer:
      "Finora separates the two reasons your net worth moves: money you actually transacted, and market prices changing underneath your holdings. It never claims income minus expenses equals net-worth change.",
    facts: [
      { label: "Transaction change", value: "+₹64,300" },
      { label: "Market movement", value: "+₹48,100" },
      { label: "Net worth change", value: "+₹1,12,400" },
    ],
  },
  {
    question: "How much did I spend this month?",
    answer:
      "Spending is read straight from your ledger for the current month in Asia/Kolkata, excluding transfers between your own accounts and investment purchases, so the figure reflects consumption only.",
    facts: [
      { label: "Spent", value: "₹1,21,700" },
      { label: "Vs last month", value: "−₹8,400" },
      { label: "Savings rate", value: "34%" },
    ],
  },
];

const PRIVACY = [
  {
    title: "Your account, your rows",
    copy: "Every record is scoped to your account at the database level. Nobody else's session can read it.",
  },
  {
    title: "You enter what you want tracked",
    copy: "Finora has no bank connection. Nothing is pulled from your bank, and no credentials are ever asked for.",
  },
  {
    title: "Answers read, never write",
    copy: "Ask Finora and What If? work on a read-only view of your data. They can't change a single figure.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 sm:px-8">
          <FinoraLogo size="sm" />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button size="sm" className="rounded-none" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-32">
          <div className="max-w-3xl">
            <Eyebrow>Personal finance, reimagined</Eyebrow>
            <h1 className="mt-7 text-[2.6rem] font-semibold leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
              See your entire financial life clearly.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Cash, spending, investments, bills, goals, liabilities and net worth — held together
              in one coherent picture, in rupees, updated as your money moves.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button size="lg" className="rounded-none px-7" asChild>
                <Link to="/auth">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Link
                to="/auth"
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* Product showcase */}
        <section className="border-y border-border bg-muted/25">
          <div className="mx-auto max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
            <ProductFrame label="Finora — Dashboard" className="hidden md:block">
              <DashboardPreview />
            </ProductFrame>
            <ProductFrame label="Finora — Dashboard" className="md:hidden">
              <DashboardPreview compact />
            </ProductFrame>
          </div>
        </section>

        {/* Brand statement */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-32">
          <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            One place for everything your money touches.
          </h2>
          <div className="mt-10 flex flex-col divide-y divide-border border-t border-border sm:flex-row sm:divide-x sm:divide-y-0 sm:border-b">
            {PILLARS.map((p) => (
              <div
                key={p}
                className="flex-1 py-3.5 text-sm text-muted-foreground sm:px-4 sm:py-5 sm:text-center sm:first:pl-0 sm:last:pr-0"
              >
                {p}
              </div>
            ))}
          </div>
        </section>

        {/* Ask Finora */}
        <section className="border-y border-border bg-muted/25">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-32">
            <div className="max-w-3xl">
              <Eyebrow>Ask Finora</Eyebrow>
              <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Your money can finally answer back.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                Not a generic chatbot. Ask Finora reads your own ledger, holdings and goals, then
                explains the numbers it used to reach the answer.
              </p>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <div className="lg:sticky lg:top-16 lg:self-start">
                <AskFinoraPrompt />
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Every answer is labelled — fact, projection, assumption — so you always know what
                  is measured and what is modelled.
                </p>
              </div>
              <div className="space-y-8">
                {EXCHANGES.map((e) => (
                  <AskFinoraExchange key={e.question} {...e} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Investments */}
        <section className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-32">
          <div className="max-w-3xl">
            <Eyebrow>Investments</Eyebrow>
            <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Not an expense tracker with a portfolio bolted on.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Mutual funds, stocks, FDs, PPF, EPF, NPS and gold sit in the same picture as your
              spending — so a SIP, a salary credit and your net worth are the same story.
            </p>
          </div>
          <ProductFrame label="Finora — Investments" className="mt-12">
            <InvestmentsPreview />
          </ProductFrame>
        </section>

        {/* Financial life */}
        <section className="border-y border-border bg-muted/25">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-32">
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              One continuous line, from salary to net worth.
            </h2>
            <ol className="mt-14 border-t border-border">
              {FLOW.map((f, i) => (
                <li
                  key={f.step}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-1 border-b border-border py-6 sm:grid-cols-[3rem_14rem_minmax(0,1fr)] sm:gap-x-8 sm:py-8"
                >
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                    {f.step}
                  </span>
                  <span className="col-span-2 text-sm leading-relaxed text-muted-foreground sm:col-span-1">
                    {f.copy}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-32">
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Your financial data stays yours.
          </h2>
          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-3">
            {PRIVACY.map((p) => (
              <div key={p.title} className="border-t border-border pt-5">
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-muted/25">
          <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-36">
            <h2 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Bring your financial life into focus.
            </h2>
            <div className="mt-10">
              <Button size="lg" className="rounded-none px-7" asChild>
                <Link to="/auth">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
          <FinoraLogo size="sm" />
          <p className="text-xs text-muted-foreground">
            Your Financial Life. Organized. © {new Date().getFullYear()} Finora.
          </p>
        </div>
      </footer>
    </div>
  );
}
