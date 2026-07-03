import { createFileRoute } from "@tanstack/react-router";
import { Plus, ArrowDownCircle } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { ChartPlaceholder } from "@/components/finance/chart-placeholder";
import { DataTablePlaceholder } from "@/components/finance/data-table-placeholder";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — MoneyOS" }] }),
  component: Income,
});

function Income() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Income"
        description="Track every rupee that comes in."
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add income
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This month" value="₹0" icon={ArrowDownCircle} tone="positive" />
        <StatCard label="Year to date" value="₹0" icon={ArrowDownCircle} tone="positive" />
        <StatCard label="Avg / month" value="₹0" icon={ArrowDownCircle} />
      </div>

      <div className="mt-6">
        <ChartPlaceholder title="Income trend" />
      </div>

      <div className="mt-6">
        <DataTablePlaceholder
          title="Income"
          columns={["Date", "Source", "Category", "Account", "Amount"]}
        />
      </div>
    </div>
  );
}
