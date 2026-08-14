import { createFileRoute } from "@tanstack/react-router";
import { Bills } from "@/pages/bills";

const TITLE = "Bills & Reminders — Finora";
const DESCRIPTION =
  "Track rent, EMIs, subscriptions and utility bills in one place, with clear due dates and reminders before every payment.";

export const Route = createFileRoute("/_authenticated/bills")({
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
  component: Bills,
});
