// Presentation only — grouping and figures are computed by the Accounts page.
import { ArrowLeftRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/finance/widget-state";
import { formatINR } from "@/lib/format";
import { isoToDMY } from "@/lib/finance-mappers";
import { cn } from "@/lib/utils";

export type AccountItem = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  icon: LucideIcon;
  color: string;
  /** ISO date of the newest ledger row seen for this account, if any. */
  lastActivityISO: string | null;
  updatedISO: string;
  isCredit: boolean;
};

export type AccountGroup = {
  key: string;
  label: string;
  hint: string;
  tone: "primary" | "destructive" | "muted";
  items: AccountItem[];
};

function activityLabel(item: AccountItem) {
  if (item.lastActivityISO) return `Last activity ${isoToDMY(item.lastActivityISO)}`;
  return `Updated ${isoToDMY(item.updatedISO)}`;
}

function AccountRow({
  item,
  onTransfer,
  onEdit,
  onRemove,
}: {
  item: AccountItem;
  onTransfer: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const Icon = item.icon;
  const negative = item.balance < 0;

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", item.color)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 break-words text-sm font-medium">{item.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {item.type}
                </Badge>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {item.institution} · {activityLabel(item)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div
                className={cn(
                  "font-display text-base font-semibold tabular-nums",
                  negative && "text-destructive",
                )}
              >
                {formatINR(Math.abs(item.balance))}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.isCredit || negative ? "outstanding" : "available"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onTransfer}>
              <ArrowLeftRight className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Transfer</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={`Edit ${item.name}`}
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={`Delete ${item.name}`}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function AccountsList({
  groups,
  totalAccounts,
  query,
  onQueryChange,
  isLoading,
  isError,
  onRetry,
  onTransfer,
  onEdit,
  onRemove,
  onAdd,
}: {
  groups: AccountGroup[];
  totalAccounts: number;
  query: string;
  onQueryChange: (value: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onTransfer: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  if (isError) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-5">
          <WidgetError message="Couldn't load your accounts." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-5">
          <WidgetSkeleton lines={6} />
        </CardContent>
      </Card>
    );
  }

  if (totalAccounts === 0) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-5">
          <WidgetEmpty
            message="Add a bank account, a cash wallet or a credit card to start tracking balances."
            actionLabel="Add an account"
            onAction={onAdd}
          />
        </CardContent>
      </Card>
    );
  }

  const visible = groups.filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search accounts or banks..."
          className="h-9 w-full pl-9 sm:max-w-xs"
          aria-label="Search accounts"
        />
      </div>

      {visible.length === 0 ? (
        <Card className="border-border/70">
          <CardContent className="p-5">
            <WidgetEmpty message="No accounts match that search." />
          </CardContent>
        </Card>
      ) : (
        visible.map((group) => {
          const groupTotal = group.items.reduce((s, a) => s + Math.abs(a.balance), 0);
          return (
            <Card key={group.key} className="overflow-hidden border-border/70">
              <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        group.tone === "destructive"
                          ? "bg-destructive"
                          : group.tone === "primary"
                            ? "bg-primary"
                            : "bg-muted-foreground/40",
                      )}
                    />
                    <h2 className="truncate text-sm font-semibold">{group.label}</h2>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{group.hint}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className={cn(
                      "font-display text-sm font-semibold tabular-nums",
                      group.tone === "destructive" && "text-destructive",
                    )}
                  >
                    {formatINR(groupTotal)}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {group.items.length} {group.items.length === 1 ? "account" : "accounts"}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/60">
                  {group.items.map((item) => (
                    <AccountRow
                      key={item.id}
                      item={item}
                      onTransfer={() => onTransfer(item.id)}
                      onEdit={() => onEdit(item.id)}
                      onRemove={() => onRemove(item.id)}
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })
      )}

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add account
        </Button>
      </div>
    </div>
  );
}
