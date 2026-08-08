import { supabase } from "@/integrations/supabase/client";
import { createRepository } from "./base.repo";
import type { Transaction, TransactionType } from "@/types/database";

const repo = createRepository("transactions");

export type TransactionPage = { rows: Transaction[]; hasMore: boolean };

export const DEFAULT_PAGE_SIZE = 100;

export const transactionsRepo = {
  ...repo,
  recent: (limit = 10) => repo.list({ orderBy: "transaction_date", limit }),
  listByType: (type: TransactionType, limit = 100) =>
    repo.list({ filters: { type }, orderBy: "transaction_date", limit }),

  /** Every ledger row linked to one holding (used before removing an asset). */
  listByAsset: (assetId: string) =>
    repo.list({ filters: { asset_id: assetId }, orderBy: "transaction_date" }),

  /**
   * Keyset-free offset pagination. Never loads the whole history into the
   * browser; callers request one page at a time.
   */
  async page(options: { pageParam?: number; pageSize?: number } = {}): Promise<TransactionPage> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const offset = (options.pageParam ?? 0) * pageSize;
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize); // one extra row tells us if more exist
    if (error) throw new Error(`[transactions.page] ${error.message}`);
    const rows = data ?? [];
    return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
  },

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
