// Presentation only — grouping, filtering and sorting here are display concerns.
// No amount, sign or category is derived from anything but the row passed in.
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Pencil, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { formatINR, formatDateIN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TRANSACTION_LABEL } from "@/lib/transaction-view";
import type { TransactionType } from "@/types/database";

export type LedgerRow = {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  category: string;
  account: string;
  method?: string | null;
  amount: number;
  txType: TransactionType;
  recurring?: boolean;
};

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const SORT_LABEL: Record<SortKey, string> = {
  date_desc: "Newest first",
  date_asc: "Oldest first",
  amount_desc: "Amount: high to low",
  amount_asc: "Amount: low to high",
};

/** Badge tone per transaction type so each kind is recognisable at a glance. */
const TYPE_TONE: Partial<Record<TransactionType, string>> = {
  income: "border-primary/30 bg-primary/10 text-primary",
  refund: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  dividend: "border-chart-1/40 bg-chart-1/10 text-chart-1",
  redemption: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  expense: "border-destructive/30 bg-destructive/10 text-destructive",
  emi: "border-chart-5/40 bg-chart-5/10 text-chart-5",
  investment: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  transfer: "border-border bg-muted text-muted-foreground",
};

function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 text-[10px] font-medium", TYPE_TONE[type])}
    >
      {TRANSACTION_LABEL[type]}
    </Badge>
  );
}

function dayLabel(iso: string) {
  return formatDateIN(iso);
}

export function LedgerSection({
  title,
  rows,
  direction,
  isLoading,
  isError,
  onRetry,
  hasMore,
  isLoadingMore,
  loadMore,
  onEdit,
  onDelete,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  showMethod = false,
}: {
  title: string;
  rows: LedgerRow[];
  direction: "in" | "out";
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  loadMore?: () => void;
  onEdit: (row: LedgerRow) => void;
  onDelete: (id: string) => void;
  emptyMessage: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  showMethod?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | TransactionType>("all");
  const [sort, setSort] = useState<SortKey>("date_desc");

  const availableTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.txType))),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (type !== "all" && r.txType !== type) return false;
      if (!q) return true;
      return [r.title, r.category, r.account, r.method ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "amount_desc") return b.amount - a.amount;
      if (sort === "amount_asc") return a.amount - b.amount;
      const cmp = a.date.localeCompare(b.date);
      return sort === "date_asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, search, type, sort]);

  const groups = useMemo(() => {
    if (sort !== "date_desc" && sort !== "date_asc") return null;
    const map = new Map<string, LedgerRow[]>();
    for (const row of visible) {
      const list = map.get(row.date);
      if (list) list.push(row);
      else map.set(row.date, [row]);
    }
    return Array.from(map, ([date, items]) => ({ date, items }));
  }, [visible, sort]);

  const sign = direction === "in" ? "+" : "-";
  const amountTone = direction === "in" ? "text-primary" : "text-foreground";
  const DirectionIcon = direction === "in" ? ArrowDownLeft : ArrowUpRight;
  const filteredOut = rows.length > 0 && visible.length === 0;

  const rowActions = (row: LedgerRow) => (
    <div className="flex shrink-0 items-center">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={`Edit ${row.title}`}
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${row.title}`}
        onClick={() => onDelete(row.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const amountCell = (row: LedgerRow) => (
    <span className={cn("font-semibold tabular-nums", amountTone)}>
      {sign}
      {formatINR(row.amount)}
    </span>
  );

  return (
    <Card className="mt-6 border-border/70">
      <CardHeader className="block">
        <div className="min-w-0">
          <CardTitle className="truncate text-base font-semibold">{title}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {visible.length} {visible.length === 1 ? "entry" : "entries"} loaded
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payee, category or account"
              className="h-9 pl-8 text-sm"
              aria-label="Search transactions"
            />
          </div>
          {availableTypes.length > 1 && (
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-9 w-full text-sm sm:w-[150px]" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRANSACTION_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-[180px]" aria-label="Sort transactions">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <WidgetSkeleton lines={6} />
        ) : isError ? (
          <WidgetError message="Couldn't load your transactions." onRetry={onRetry} />
        ) : rows.length === 0 ? (
          <WidgetEmpty
            message={emptyMessage}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
          />
        ) : filteredOut ? (
          <WidgetEmpty message="No entries match these filters." />
        ) : (
          <>
            {/* Mobile: grouped cards. */}
            <div className="space-y-4 md:hidden">
              {(groups ?? [{ date: "", items: visible }]).map((group) => (
                <div key={group.date || "sorted"} className="space-y-2">
                  {group.date && (
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {dayLabel(group.date)}
                    </div>
                  )}
                  {group.items.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-border/70 bg-card p-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{row.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <TypeBadge type={row.txType} />
                            <Badge variant="outline" className="text-[10px]">
                              {row.category}
                            </Badge>
                            {row.recurring && (
                              <Badge variant="secondary" className="text-[10px]">
                                Recurring
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1.5 truncate text-xs text-muted-foreground">
                            {row.account}
                            {showMethod && row.method ? ` · ${row.method}` : ""}
                            {!group.date ? ` · ${dayLabel(row.date)}` : ""}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm">{amountCell(row)}</span>
                          {rowActions(row)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Desktop: dense table. */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Details</th>
                    <th className="py-2 pr-3 font-medium">Category</th>
                    <th className="py-2 pr-3 font-medium">Account</th>
                    {showMethod && <th className="py-2 pr-3 font-medium">Method</th>}
                    <th className="py-2 pr-3 text-right font-medium">Amount</th>
                    <th className="w-[84px] py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40"
                    >
                      <td className="whitespace-nowrap py-2.5 pr-3 text-muted-foreground tabular-nums">
                        {dayLabel(row.date)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                            <DirectionIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{row.title}</span>
                            <span className="mt-0.5 flex items-center gap-1.5">
                              <TypeBadge type={row.txType} />
                              {row.recurring && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Recurring
                                </Badge>
                              )}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className="text-[10px]">
                          {row.category}
                        </Badge>
                      </td>
                      <td className="max-w-[160px] truncate py-2.5 pr-3 text-muted-foreground">
                        {row.account}
                      </td>
                      {showMethod && (
                        <td className="py-2.5 pr-3 text-muted-foreground">{row.method ?? "—"}</td>
                      )}
                      <td className="whitespace-nowrap py-2.5 pr-3 text-right">{amountCell(row)}</td>
                      <td className="py-2.5 text-right">{rowActions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="flex justify-center pt-1">
                <Button variant="outline" size="sm" disabled={isLoadingMore} onClick={loadMore}>
                  {isLoadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
