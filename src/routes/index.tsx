import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, PiggyBank, Shield, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinoraLogo } from "@/components/brand/logo";

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

const features = [
  { icon: Wallet, title: "All accounts, one view", copy: "Bank, brokerage, cash. Consolidated in real time." },
  { icon: BarChart3, title: "Cash flow, decoded", copy: "Income vs. expenses with elegant, honest charts." },
  { icon: PiggyBank, title: "Assets & liabilities", copy: "Watch net worth grow with clarity, not clutter." },
  { icon: Shield, title: "Yours, privately", copy: "Bank-grade encryption. You own your data." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <FinoraLogo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <section className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Premium personal finance
          </div>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
            Your Financial Life. <span className="text-primary">Organized.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Finora helps you manage income, expenses, investments, assets, liabilities, budgets,
            goals and bills from one intelligent dashboard.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth">
                Open Finora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="card-elevated rounded-2xl border border-border bg-card p-5 hover:-translate-y-0.5"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.copy}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
          <FinoraLogo size="sm" />
          <p className="text-xs text-muted-foreground">
            Your Financial Life. Organized. © {new Date().getFullYear()} Finora.
          </p>
        </div>
      </footer>
    </div>
  );
}
