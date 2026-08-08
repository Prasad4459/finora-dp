-- 1. Opening balance: accounts keep an explicit starting balance; the running
--    balance stays ledger-derived (opening_balance + transaction effects).
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

-- 2. Integrity: a transfer must always land somewhere. Goal contributions are
--    transfers with goal_id, so this also stops goal money from disappearing.
CREATE OR REPLACE FUNCTION public.tx_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'transfer' AND NEW.to_wallet_id IS NULL THEN
    RAISE EXCEPTION 'A transfer must have a destination account';
  END IF;
  IF NEW.type = 'transfer' AND NEW.to_wallet_id = NEW.wallet_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be different';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tx_validate ON public.transactions;
CREATE TRIGGER trg_tx_validate
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.tx_validate();

-- 3. Server-side aggregation, grouped by Indian calendar month.
--    transaction_date is a DATE already stored as the IST calendar date, so no
--    timezone conversion happens here.
CREATE OR REPLACE FUNCTION public.tx_summary_monthly(_from date, _to date)
RETURNS TABLE (
  y int,
  m int,
  tx_type public.transaction_type,
  total numeric,
  interest_total numeric,
  principal_total numeric,
  tx_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXTRACT(YEAR FROM t.transaction_date)::int,
    EXTRACT(MONTH FROM t.transaction_date)::int,
    t.type,
    COALESCE(SUM(t.amount), 0)::numeric,
    COALESCE(SUM(COALESCE(t.interest_amount, 0)), 0)::numeric,
    COALESCE(SUM(
      COALESCE(t.principal_amount,
        CASE WHEN t.type = 'emi' THEN t.amount - COALESCE(t.interest_amount, 0) ELSE 0 END)
    ), 0)::numeric,
    COUNT(*)::bigint
  FROM public.transactions t
  WHERE t.user_id = auth.uid()
    AND t.status = 'completed'
    AND t.transaction_date >= _from
    AND t.transaction_date <= _to
  GROUP BY 1, 2, 3;
$$;

CREATE OR REPLACE FUNCTION public.tx_category_monthly(_from date, _to date)
RETURNS TABLE (
  y int,
  m int,
  category_id uuid,
  category_name text,
  tx_type public.transaction_type,
  total numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXTRACT(YEAR FROM t.transaction_date)::int,
    EXTRACT(MONTH FROM t.transaction_date)::int,
    t.category_id,
    COALESCE(c.name, 'Others')::text,
    t.type,
    COALESCE(SUM(t.amount), 0)::numeric
  FROM public.transactions t
  LEFT JOIN public.categories c ON c.id = t.category_id
  WHERE t.user_id = auth.uid()
    AND t.status = 'completed'
    AND t.transaction_date >= _from
    AND t.transaction_date <= _to
  GROUP BY 1, 2, 3, 4, 5;
$$;

GRANT EXECUTE ON FUNCTION public.tx_summary_monthly(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tx_category_monthly(date, date) TO authenticated;
