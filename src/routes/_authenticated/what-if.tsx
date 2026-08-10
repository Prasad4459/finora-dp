import { createFileRoute } from "@tanstack/react-router";
import { WhatIf } from "@/pages/what-if";

export const Route = createFileRoute("/_authenticated/what-if")({
  head: () => ({
    meta: [
      { title: "What If? Financial Simulator — Finora" },
      {
        name: "description",
        content:
          "Explore how a new EMI, extra investing or a loan prepayment could change your cash flow, net worth and goals.",
      },
      { property: "og:title", content: "What If? Financial Simulator — Finora" },
      {
        property: "og:description",
        content:
          "Compare your current path with a hypothetical decision using your own Finora data. Read-only projections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhatIf,
});