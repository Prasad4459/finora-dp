import { createFileRoute } from "@tanstack/react-router";
import { Liabilities } from "@/pages/liabilities";

const TITLE = "Liabilities — Finora";
const DESCRIPTION =
  "See loans and credit cards in one place with outstanding balances, interest rates, EMIs and next due dates.";

export const Route = createFileRoute("/_authenticated/liabilities")({
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
  component: Liabilities,
});
