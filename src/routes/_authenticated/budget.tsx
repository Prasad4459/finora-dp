import { createFileRoute } from "@tanstack/react-router";
import { Budget } from "@/pages/budget";

const TITLE = "Budget — Finora";
const DESCRIPTION =
  "Set monthly category budgets and see exactly how much of each limit you have already used.";

export const Route = createFileRoute("/_authenticated/budget")({
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
  component: Budget,
});
