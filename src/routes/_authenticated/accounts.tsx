import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { ChartPlaceholder } from "@/components/finance/chart-placeholder";
import { DataTablePlaceholder } from "@/components/finance/data-table-placeholder";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Accounts — MoneyOS" }] }),
  component: Accounts,
});

function Accounts() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Accounts"
        description="All your bank, cash, and investment accounts."
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add account
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This month" value="₹0" icon={Wallet} tone="neutral" />
        <StatCard label="Year to date" value="₹0" icon={Wallet} tone="neutral" />
        <StatCard label="Avg / month" value="₹0" icon={Wallet} />
      </div>

      <div className="mt-6">
        <ChartPlaceholder title="Accounts trend" />
      </div>

      <div className="mt-6">
        <DataTablePlaceholder
          title="Accounts"
          columns={["Name", "Type", "Institution", "Balance", "Updated"]}
        />
      </div>
    </div>
  );
}
