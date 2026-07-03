import { createFileRoute } from "@tanstack/react-router";
import { Plus, ArrowUpCircle } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { ChartPlaceholder } from "@/components/finance/chart-placeholder";
import { DataTablePlaceholder } from "@/components/finance/data-table-placeholder";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — MoneyOS" }] }),
  component: Expenses,
});

function Expenses() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Expenses"
        description="See where your money goes, honestly."
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add expense
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This month" value="$0.00" icon={ArrowUpCircle} tone="negative" />
        <StatCard label="Year to date" value="$0.00" icon={ArrowUpCircle} tone="negative" />
        <StatCard label="Avg / month" value="$0.00" icon={ArrowUpCircle} />
      </div>

      <div className="mt-6">
        <ChartPlaceholder title="Expenses trend" />
      </div>

      <div className="mt-6">
        <DataTablePlaceholder
          title="Expenses"
          columns={["Date", "Merchant", "Category", "Account", "Amount"]}
        />
      </div>
    </div>
  );
}
