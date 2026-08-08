import { createRepository } from "./base.repo";

const repo = createRepository("bill_payments");

export const billPaymentsRepo = {
  ...repo,
  /** Every payment of the signed-in user, newest first (RLS-scoped). */
  listAll: (limit = 300) => repo.list({ orderBy: "due_date", limit }),
  listForBill: (billId: string) => repo.list({ filters: { bill_id: billId }, orderBy: "due_date" }),
};
