import { createFileRoute } from "@tanstack/react-router";
import { Bills } from "@/pages/bills";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({ meta: [{ title: "Bills & Reminders — Finora" }] }),
  component: Bills,
});
