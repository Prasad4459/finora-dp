import { createFileRoute } from "@tanstack/react-router";
import { Plus, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { ChartPlaceholder } from "@/components/finance/chart-placeholder";
import { DataTablePlaceholder } from "@/components/finance/data-table-placeholder";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/liabilities")({
  head: () => ({ meta: [{ title: "Liabilities — MoneyOS" }] }),
  component: Liabilities,
});

function Liabilities() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Liabilities"
        description="Loans, cards, and everything you owe."
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add liability
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This month" value="₹0" icon={CreditCard} tone="negative" />
        <StatCard label="Year to date" value="₹0" icon={CreditCard} tone="negative" />
        <StatCard label="Avg / month" value="₹0" icon={CreditCard} />
      </div>

      <div className="mt-6">
        <ChartPlaceholder title="Liabilities trend" />
      </div>

      <div className="mt-6">
        <DataTablePlaceholder
          title="Liabilities"
          columns={["Name", "Type", "Balance", "Rate", "Min. payment"]}
        />
      </div>
    </div>
  );
}
