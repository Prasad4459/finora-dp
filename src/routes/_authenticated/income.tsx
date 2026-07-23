import { createFileRoute } from "@tanstack/react-router";
import { Income } from "@/pages/income";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — MoneyOS" }] }),
  component: Income,
});
