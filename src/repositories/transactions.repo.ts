import { supabase } from "@/integrations/supabase/client";
import { createRepository } from "./base.repo";
import type { Transaction, TransactionType } from "@/types/database";

const repo = createRepository("transactions");

export const transactionsRepo = {
  ...repo,
  recent: (limit = 10) => repo.list({ orderBy: "transaction_date", limit }),
  listByType: (type: TransactionType, limit = 100) =>
    repo.list({ filters: { type }, orderBy: "transaction_date", limit }),

  async listBetween(from: string, to: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("transaction_date", from)
      .lte("transaction_date", to)
      .order("transaction_date", { ascending: false });
    if (error) throw new Error(`[transactions.listBetween] ${error.message}`);
    return data ?? [];
  },
};