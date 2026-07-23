import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/dashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MoneyOS" }] }),
  component: Dashboard,
});
