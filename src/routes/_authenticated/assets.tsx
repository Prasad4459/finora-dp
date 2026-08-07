import { createFileRoute } from "@tanstack/react-router";
import { Assets } from "@/pages/assets";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "Assets — Finora" }] }),
  component: Assets,
});
