import { createFileRoute } from "@tanstack/react-router";
import { Assets } from "@/pages/assets";

const TITLE = "Assets — Finora";
const DESCRIPTION =
  "Track property, gold, vehicles and other assets with invested cost, current value and unrealised gain.";

export const Route = createFileRoute("/_authenticated/assets")({
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
  component: Assets,
});
