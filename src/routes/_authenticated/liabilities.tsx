import { createFileRoute } from "@tanstack/react-router";
import { Liabilities } from "@/pages/liabilities";

export const Route = createFileRoute("/_authenticated/liabilities")({
  head: () => ({ meta: [{ title: "Liabilities — Finora" }] }),
  component: Liabilities,
});
