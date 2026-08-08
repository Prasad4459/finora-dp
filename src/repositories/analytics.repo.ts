// Server-side financial aggregation. The browser only ever holds ONE page of
// transactions, so no financial total may be derived from that page. Every
// aggregate below is computed by Postgres over the full history and returns a
// handful of rows (one per month / month+category).
import { supabase } from "@/integrations/supabase/client";

export type MonthlySummaryRow = {
  y: number;
  m: number;
  tx_type: string;
  total: number;
  interest_total: number;
  principal_total: number;
  tx_count: number;
};

export type CategoryMonthlyRow = {
  y: number;
  m: number;
  category_id: string | null;
  category_name: string;
  tx_type: string;
  total: number;
};

export const analyticsRepo = {
  /** Totals per (month, transaction type) between two IST calendar dates. */
  async summaryMonthly(from: string, to: string): Promise<MonthlySummaryRow[]> {
    const { data, error } = await supabase.rpc("tx_summary_monthly", { _from: from, _to: to });
    if (error) throw new Error(`[analytics.summaryMonthly] ${error.message}`);
    return (data ?? []) as MonthlySummaryRow[];
  },

  /** Totals per (month, category, transaction type) — powers budgets & charts. */
  async categoryMonthly(from: string, to: string): Promise<CategoryMonthlyRow[]> {
    const { data, error } = await supabase.rpc("tx_category_monthly", { _from: from, _to: to });
    if (error) throw new Error(`[analytics.categoryMonthly] ${error.message}`);
    return (data ?? []) as CategoryMonthlyRow[];
  },
};