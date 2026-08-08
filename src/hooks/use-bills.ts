import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  billPaymentsRepo,
  billsRepo,
  notificationsRepo,
  transactionsRepo,
} from "@/repositories";
import { BILL_PAYMENT_KEYS, CACHE, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import { formatINR } from "@/lib/format";
import { todayISO } from "@/lib/date-in";
import { nextDueDate, occurrenceKey, type Frequency } from "@/services/bills";
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
  const dueISO = (bill.due_date ?? todayISO()).slice(0, 10);
  const periodKey = occurrenceKey(dueISO);

  // Duplicate guard (also enforced by a UNIQUE(bill_id, period_key) index).
  const existing = await billPaymentsRepo.listForBill(bill.id);
  if (existing.some((p) => p.period_key === periodKey)) {
    throw new Error("This bill occurrence is already marked as paid");
  }

  const tx = await transactionsRepo.create({
    type: "expense",
    amount: input.amount,
    transaction_date: input.paidDate,
    wallet_id: input.walletId,
    category_id: bill.category_id,
    payee: bill.name,
    notes: input.notes || `Bill payment — ${bill.name}`,
  });

  await billPaymentsRepo.create({
    bill_id: bill.id,
    transaction_id: tx.id,
    period_key: periodKey,
    due_date: dueISO,
    expected_amount: Number(bill.amount),
    paid_amount: input.amount,
    paid_date: input.paidDate,
  });

  // Recurring bills roll forward to their next occurrence; the recurring
  // definition stays the single source of truth (no future rows created).
  const next = bill.is_recurring ? nextDueDate(dueISO, bill.frequency as Frequency) : null;
  await billsRepo.update(bill.id, {
    last_paid_date: input.paidDate,
    ...(next ? { due_date: next, status: "upcoming" as const } : { status: "paid" as const }),
  });

  await notificationsRepo
    .create({
      type: "bill_reminder",
      title: `${bill.name} paid`,
      message: `${formatINR(input.amount)} paid from your account on ${input.paidDate}.`,
      dedupe_key: `bill:${bill.id}:${periodKey}:paid`,
      is_read: false,
    })
    .catch(() => undefined); // a duplicate notification must never fail a payment

  return tx;
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
