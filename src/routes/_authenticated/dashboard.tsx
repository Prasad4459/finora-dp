import { createFileRoute } from "@tanstack/react-router";
import { Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { ChartPlaceholder } from "@/components/finance/chart-placeholder";
import { DataTablePlaceholder } from "@/components/finance/data-table-placeholder";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MoneyOS" }] }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description="A calm overview of your finances."
        actions={<Button size="sm">Add transaction</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net worth" value="$0.00" delta="—" icon={TrendingUp} />
        <StatCard label="Total balance" value="$0.00" delta="Across all accounts" icon={Wallet} />
        <StatCard label="Income (30d)" value="$0.00" delta="—" icon={ArrowDownCircle} tone="positive" />
        <StatCard label="Expenses (30d)" value="$0.00" delta="—" icon={ArrowUpCircle} tone="negative" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartPlaceholder title="Cash flow" description="Income vs. expenses over time" />
        </div>
        <ChartPlaceholder title="Spending by category" description="Last 30 days" />
      </div>

      <div className="mt-6">
        <DataTablePlaceholder
          title="Recent transactions"
          columns={["Date", "Description", "Category", "Account", "Amount"]}
        />
      </div>
    </div>
  );
}
