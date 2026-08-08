import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/format";
import { todayISO } from "@/lib/date-in";
import type { BillRow, Wallet } from "@/types/database";

export type MarkPaidValues = { amount: number; walletId: string; paidDate: string };

/**
 * Confirms a bill payment. The amount defaults to the bill's EXPECTED amount
 * but stays editable — variable bills (electricity, credit card) are paid at
 * their actual value while the bill keeps its expected amount for planning.
 */
export function MarkPaidDialog({
  bill,
  wallets,
  pending,
  onClose,
  onConfirm,
}: {
  bill: BillRow | null;
  wallets: Wallet[];
  pending?: boolean;
  onClose: () => void;
  onConfirm: (values: MarkPaidValues) => void;
}) {
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [paidDate, setPaidDate] = useState(todayISO());
  const [lastId, setLastId] = useState<string | null>(null);
  const submittingRef = useRef(false);

  if (bill && bill.id !== lastId) {
    setLastId(bill.id);
    setAmount(String(bill.amount));
    setWalletId(bill.wallet_id ?? wallets[0]?.id ?? "");
    setPaidDate(todayISO());
    submittingRef.current = false;
  }

  const value = Number(amount);
  const valid = walletId && Number.isFinite(value) && value > 0;
  const expected = Number(bill?.amount ?? 0);
  const differs = valid && Math.abs(value - expected) > 0.5;

  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark “{bill?.name}” as paid</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Paid from account</Label>
            <Select value={walletId} onValueChange={setWalletId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>{w.name}</span>
                      <span className="text-xs text-muted-foreground">{formatINR(Number(w.balance))}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Amount paid (₹)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Expected {formatINR(expected)}
              {differs ? ` · paying ${formatINR(value)}` : ""}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Payment date</Label>
            <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            This creates an expense transaction; your account balance updates through the ledger.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || pending}
            onClick={() => {
              if (!valid || submittingRef.current) return;
              submittingRef.current = true;
              onConfirm({ amount: value, walletId, paidDate });
            }}
          >
            {pending ? "Saving…" : "Confirm payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
