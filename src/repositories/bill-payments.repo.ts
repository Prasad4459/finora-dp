import { createRepository } from "./base.repo";
import { supabase } from "@/integrations/supabase/client";

const repo = createRepository("bill_payments");

export const billPaymentsRepo = {
  ...repo,
  /** Every payment of the signed-in user, newest first (RLS-scoped). */
  listAll: (limit = 300) => repo.list({ orderBy: "due_date", limit }),
  listForBill: (billId: string) => repo.list({ filters: { bill_id: billId }, orderBy: "due_date" }),
  /**
   * Claims an exact bill occurrence and writes its expense in one database
   * transaction. The database row lock + unique occurrence index make retries
   * and concurrent clicks idempotent.
   */
  async payOccurrence(values: {
    billId: string;
    occurrenceDate: string;
    amount: number;
    walletId: string;
    paidDate: string;
    nextDueDate: string | null;
  }): Promise<{ created: boolean; transactionId: string | null }> {
    const { data, error } = await supabase.rpc("pay_bill_occurrence", {
      _bill_id: values.billId,
      _occurrence_date: values.occurrenceDate,
      _amount: values.amount,
      _wallet_id: values.walletId,
      _paid_date: values.paidDate,
      _next_due_date: values.nextDueDate ?? undefined,
    });
    if (error) throw new Error(`[bill_payments.payOccurrence] ${error.message}`);
    const result = data?.[0];
    return {
      created: result?.created === true,
      transactionId: result?.transaction_id ?? null,
    };
  },
};
