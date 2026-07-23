import { createFileRoute } from "@tanstack/react-router";
import { Accounts } from "@/pages/accounts";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Accounts — MoneyOS" }] }),
  component: Accounts,
});
