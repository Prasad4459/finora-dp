import { createFileRoute } from "@tanstack/react-router";
import { Goals } from "@/pages/goals";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goals — MoneyOS" }] }),
  component: Goals,
});
