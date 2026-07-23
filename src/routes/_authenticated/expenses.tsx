import { createFileRoute } from "@tanstack/react-router";
import { Expenses } from "@/pages/expenses";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — MoneyOS" }] }),
  component: Expenses,
});
