import { createFileRoute } from "@tanstack/react-router";
import { Budget } from "@/pages/budget";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({ meta: [{ title: "Budget — Finora" }] }),
  component: Budget,
});
