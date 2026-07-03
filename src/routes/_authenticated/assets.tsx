import { createFileRoute } from "@tanstack/react-router";
import { Plus, Landmark } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { ChartPlaceholder } from "@/components/finance/chart-placeholder";
import { DataTablePlaceholder } from "@/components/finance/data-table-placeholder";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "Assets — MoneyOS" }] }),
  component: Assets,
});

function Assets() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Assets"
        description="Everything you own that holds value."
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add asset
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This month" value="$0.00" icon={Landmark} tone="positive" />
        <StatCard label="Year to date" value="$0.00" icon={Landmark} tone="positive" />
        <StatCard label="Avg / month" value="$0.00" icon={Landmark} />
      </div>

      <div className="mt-6">
        <ChartPlaceholder title="Assets trend" />
      </div>

      <div className="mt-6">
        <DataTablePlaceholder
          title="Assets"
          columns={["Name", "Type", "Value", "Acquired", "Notes"]}
        />
      </div>
    </div>
  );
}
