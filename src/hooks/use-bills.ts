import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  billPaymentsRepo,
  billsRepo,
  notificationsRepo,
} from "@/repositories";
import { BILL_PAYMENT_KEYS, CACHE, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import { formatINR } from "@/lib/format";
import { todayISO } from "@/lib/date-in";
import { nextDueDate, type Frequency } from "@/services/bills";
import type { BillInsert, BillRow, BillUpdate } from "@/types/database";

export const billsQueryOptions = queryOptions({
  queryKey: financeKeys.bills,
  queryFn: () => billsRepo.listUpcoming(),
  ...CACHE.medium,
});

export const billPaymentsQueryOptions = queryOptions({
  queryKey: financeKeys.billPayments,
  queryFn: () => billPaymentsRepo.listAll(),
  ...CACHE.medium,
});

export type PayBillInput = {
  bill: BillRow;
  /** Amount actually paid — may differ from the bill's expected amount. */
  amount: number;
  walletId: string;
  paidDate: string;
  notes?: string;
};

/**
 * Marks ONE occurrence of a bill as paid.
 *
 * Money only ever moves through the existing transaction engine: an expense
 * transaction is inserted and the database trigger updates the wallet. Nothing
 * here touches wallet.balance directly.
 */
export async function payBill(input: PayBillInput) {
  const { bill } = input;
  // A bill payment always moves real money out of a real account.
  if (!input.walletId) throw new Error("Select an account for this transaction.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a valid amount");
  const dueISO = (bill.due_date ?? todayISO()).slice(0, 10);
  const next = bill.is_recurring ? nextDueDate(dueISO, bill.frequency as Frequency) : null;

  // Claim + expense insert + wallet debit + bill roll-forward are one database
  // transaction. A repeated or concurrent call for this exact date returns
  // created=false before any ledger row is inserted.
  const result = await billPaymentsRepo.payOccurrence({
    billId: bill.id,
    occurrenceDate: dueISO,
    amount: input.amount,
    walletId: input.walletId,
    paidDate: input.paidDate,
    nextDueDate: next,
  });
  if (!result.created) return result;

  await notificationsRepo
    .create({
      type: "bill_reminder",
      title: `${bill.name} paid`,
      message: `${formatINR(input.amount)} paid from your account on ${input.paidDate}.`,
      dedupe_key: `bill:${bill.id}:${dueISO}:paid`,
      is_read: false,
    })
    .catch(() => undefined); // a duplicate notification must never fail a payment

  return result;
}

export function useBillPayments() {
  const query = useQuery(billPaymentsQueryOptions);
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

export function useBills() {
  const query = useQuery(billsQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<BillInsert, "user_id">) => billsRepo.create(values),
    invalidate: [financeKeys.bills],
    success: "Bill added",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: BillUpdate }) => billsRepo.update(id, values),
    invalidate: [financeKeys.bills],
    success: "Bill updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => billsRepo.remove(id),
    invalidate: [financeKeys.bills, financeKeys.billPayments],
    success: "Bill removed",
  });
  const pay = useEntityMutation({
    mutationFn: (input: PayBillInput) => payBill(input),
    invalidate: BILL_PAYMENT_KEYS,
    success: "Bill marked as paid",
  });

  return {
    rows: query.data ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    create,
    update,
    remove,
    pay,
  };
}
