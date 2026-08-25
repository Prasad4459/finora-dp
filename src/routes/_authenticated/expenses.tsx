import { createFileRoute } from "@tanstack/react-router";
import { Expenses } from "@/pages/expenses";

const TITLE = "Expenses — Finora";
const DESCRIPTION =
  "Review every expense recorded in Finora by date, category and account, with monthly spending totals.";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Expenses,
});
