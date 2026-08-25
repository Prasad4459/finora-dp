import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/dashboard";

const TITLE = "Dashboard — Finora";
const DESCRIPTION =
  "Your money at a glance: net worth, available balance, cash flow, spending and what needs attention this week.";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  component: Dashboard,
});
