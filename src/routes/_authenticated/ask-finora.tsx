import { createFileRoute } from "@tanstack/react-router";
import { AskFinora } from "@/pages/ask-finora";

export const Route = createFileRoute("/_authenticated/ask-finora")({
  head: () => ({
    meta: [
      { title: "Ask Finora — Your Personal Financial Copilot" },
      {
        name: "description",
        content:
          "Ask questions about your own money and get clear, personalised explanations built on your Finora data and projections.",
      },
      { property: "og:title", content: "Ask Finora — Your Personal Financial Copilot" },
      {
        property: "og:description",
        content:
          "Personalised answers about your savings, debt, goals and financial decisions, based on your real Finora data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AskFinora,
});
