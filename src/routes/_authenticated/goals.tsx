import { createFileRoute } from "@tanstack/react-router";
import { Goals } from "@/pages/goals";

const title = "Goals — Finora";
const description =
  "Track savings goals in Finora: see how much is funded, what's left to save and which target dates are close.";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Goals,
});
