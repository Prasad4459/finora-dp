import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { transactionsRepo } from "@/repositories";
import { CACHE } from "@/hooks/query-keys";
import { formatINR, formatDateIN } from "@/lib/format";
import { useFinance } from "@/store/finance-store";

type Props = {
  holding: { id: string; name: string } | null;
  onClose: () => void;
};

/**
 * Removal is deliberately gated: a holding with ledger history can only be
 * removed after the user confirms that its linked transactions must be
 * reversed. Reversal happens by deleting those transactions, so the database
 * trigger restores wallet balances — nothing is patched by hand.
 */
export function RemoveInvestmentDialog({ holding, onClose }: Props) {
  const { removeInvestment, openDialog } = useFinance();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const linked = useQuery({
    queryKey: ["transactions", "by-asset", holding?.id],
    queryFn: () => transactionsRepo.listByAsset(holding!.id),
    enabled: !!holding,
    ...CACHE.short,
  });

  const rows = linked.data ?? [];
  const hasHistory = rows.length > 0;
  const blocked = linked.isLoading || linked.isError || busy || (hasHistory && !confirmed);

  const close = () => {
    setConfirmed(false);
    onClose();
  };

  const submit = async () => {
    if (!holding) return;
    setBusy(true);
    try {
      await removeInvestment(holding.id, { reverseTransactions: hasHistory });
      close();
    } catch {
      /* the store already surfaced the error */
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={!!holding} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {holding?.name}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {linked.isLoading && <p>Checking linked transactions…</p>}
              {linked.isError && (
                <p className="text-destructive">
                  Could not check linked transactions. Try again before removing.
                </p>
              )}
              {!linked.isLoading && !linked.isError && !hasHistory && (
                <p>This holding has no linked transactions, so removing it destroys no history.</p>
              )}
              {hasHistory && (
                <>
                  <p className="flex items-start gap-2 text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <span>
                      This holding has {rows.length} linked transaction
                      {rows.length === 1 ? "" : "s"}. Removing it will reverse them, which changes
                      the affected account balances back.
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    If you actually sold this investment, close the dialog and use{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline underline-offset-2"
                      onClick={() => {
                        close();
                        openDialog("redemption");
                      }}
                    >
                      Sell / redeem
                    </button>{" "}
                    instead so the history is preserved.
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2 text-xs">
                    {rows.map((t) => (
                      <li key={t.id} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">
                          {formatDateIN(t.transaction_date)} · {t.type}
                        </span>
                        <span className="tabular-nums">{formatINR(Number(t.amount))}</span>
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-start gap-2 text-foreground">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={(c) => setConfirmed(c === true)}
                      className="mt-0.5"
                    />
                    <span>I understand these transactions will be reversed and removed.</span>
                  </label>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={blocked}
            onClick={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {busy ? "Removing…" : hasHistory ? "Reverse & remove" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}