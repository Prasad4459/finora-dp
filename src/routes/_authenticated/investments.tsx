import { createFileRoute } from "@tanstack/react-router";
import { Investments } from "@/pages/investments";

export const Route = createFileRoute("/_authenticated/investments")({
  head: () => ({
    meta: [
      { title: "Investments & Savings — Finora" },
      {
        name: "description",
        content:
          "Track mutual funds, stocks, FDs, PPF, EPF, NPS, gold and small savings in one Indian portfolio view.",
      },
      { property: "og:title", content: "Investments & Savings — Finora" },
      {
        property: "og:description",
        content: "Your India investment portfolio: holdings, allocation, SIPs and maturities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Investments,
});