import { createFileRoute } from "@tanstack/react-router";
import { Accounts } from "@/pages/accounts";

const title = "Wallets & Accounts — Finora";
const description =
  "See every bank, cash, UPI, card and investment account in Finora with live balances, what you owe and recent account activity.";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Accounts,
});
