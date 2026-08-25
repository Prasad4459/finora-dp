import { createFileRoute } from "@tanstack/react-router";
import { Income } from "@/pages/income";

const TITLE = "Income — Finora";
const DESCRIPTION =
  "Every credit recorded in Finora: salary, interest, refunds and other income, with clear monthly totals.";

export const Route = createFileRoute("/_authenticated/income")({
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
  component: Income,
});
