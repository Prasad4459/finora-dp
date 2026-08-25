import { Plus, Landmark, TrendingUp, TrendingDown, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDateIN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAssets } from "@/hooks/use-assets";
import { useFinance } from "@/store/finance-store";

/** Percentage change guarded against a zero/absent cost base. */
const pctChange = (gain: number, invested: number) =>
  invested > 0 ? `${gain >= 0 ? "+" : ""}${((gain / invested) * 100).toFixed(1)}%` : null;

export function Assets() {
  const { assets, openDialog, openEditDialog, removeAsset } = useFinance();
  const assetsData = useAssets();
  const totalCur = assets.reduce((s, a) => s + a.current, 0);
  const totalPur = assets.reduce((s, a) => s + a.purchase, 0);
  const gain = totalCur - totalPur;
  const gainPct = pctChange(gain, totalPur);

  const isLoading = assetsData.isLoading;
  const isError = assetsData.isError;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Assets"
        description="Everything you own that holds value."
        actions={
          <Button size="sm" onClick={() => openDialog("asset")}>
            <Plus className="mr-1 h-4 w-4" /> Add asset
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current value"
          value={formatINR(totalCur)}
          icon={Landmark}
          tone="positive"
          state={isError ? "error" : isLoading ? "loading" : "ready"}
          onRetry={assetsData.refetch}
        />
        <StatCard
          label="Invested"
          value={formatINR(totalPur)}
          icon={Landmark}
          state={isError ? "error" : isLoading ? "loading" : "ready"}
          onRetry={assetsData.refetch}
        />
        <StatCard
          label="Unrealised gain"
          value={formatINR(gain)}
          delta={gainPct ? `${gainPct} on invested cost` : "No cost base recorded"}
          icon={gain >= 0 ? TrendingUp : TrendingDown}
          tone={gain >= 0 ? "positive" : "negative"}
          state={isError ? "error" : isLoading ? "loading" : "ready"}
          onRetry={assetsData.refetch}
        />
      </div>

      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Portfolio</CardTitle>
        </CardHeader>
        <CardContent className={cn(assets.length > 0 && !isLoading && !isError && "p-0")}>
          {isError ? (
            <WidgetError message="Couldn't load your assets." onRetry={assetsData.refetch} />
          ) : isLoading ? (
            <WidgetSkeleton lines={5} />
          ) : assets.length === 0 ? (
            <WidgetEmpty
              message="No assets yet. Add property, gold, vehicles or anything you own that holds value."
              actionLabel="Add your first asset"
              onAction={() => openDialog("asset")}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Acquired</TableHead>
                  <TableHead className="text-right">Invested</TableHead>
                  <TableHead className="text-right">Current value</TableHead>
                  <TableHead className="text-right">Unrealised gain</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => {
                  const pl = a.current - a.purchase;
                  const pct = pctChange(pl, a.purchase);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {a.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateIN(a.date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {formatINR(a.purchase)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                        {formatINR(a.current)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap text-right font-semibold tabular-nums",
                          pl >= 0 ? "text-primary" : "text-destructive",
                        )}
                      >
                        {pl >= 0 ? "+" : "−"}
                        {formatINR(Math.abs(pl))}
                        {pct && <span className="ml-1 text-xs opacity-70">({pct})</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            aria-label={`Edit ${a.name}`}
                            onClick={() => openEditDialog({ kind: "asset", entity: a })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            aria-label={`Delete ${a.name}`}
                            onClick={() => removeAsset(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
