import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/pages/settings";

const TITLE = "Settings — Finora";
const DESCRIPTION =
  "Manage your Finora profile, currency, appearance and reminder preferences.";

export const Route = createFileRoute("/_authenticated/settings")({
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
  component: Settings,
});
