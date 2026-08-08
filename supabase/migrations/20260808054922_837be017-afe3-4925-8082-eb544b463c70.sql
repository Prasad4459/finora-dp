ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS principal_amount numeric,
  ADD COLUMN IF NOT EXISTS interest_amount numeric,
  ADD COLUMN IF NOT EXISTS liability_id uuid REFERENCES public.liabilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_liability_id ON public.transactions(liability_id);
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON public.transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON public.transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);

CREATE OR REPLACE FUNCTION public.tx_apply(_t public.transactions, _sign numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amt numeric := COALESCE(_t.amount, 0) * _sign;
  princ numeric;
BEGIN
  IF _t.status IS DISTINCT FROM 'completed'::public.transaction_status THEN
    RETURN;
  END IF;

  IF _t.type IN ('income', 'refund', 'dividend') THEN
    IF _t.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + amt WHERE id = _t.wallet_id;
    END IF;
  ELSIF _t.type IN ('expense', 'investment', 'emi') THEN
    IF _t.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - amt WHERE id = _t.wallet_id;
    END IF;
  ELSIF _t.type = 'transfer' THEN
    IF _t.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - amt WHERE id = _t.wallet_id;
    END IF;
    IF _t.to_wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + amt WHERE id = _t.to_wallet_id;
    END IF;
  END IF;

  IF _t.type = 'investment' AND _t.asset_id IS NOT NULL THEN
    UPDATE public.assets
      SET current_value = current_value + amt,
          purchase_value = purchase_value + amt
    WHERE id = _t.asset_id;
  END IF;

  IF _t.type = 'emi' AND _t.liability_id IS NOT NULL THEN
    princ := COALESCE(_t.principal_amount, COALESCE(_t.amount, 0) - COALESCE(_t.interest_amount, 0)) * _sign;
    UPDATE public.liabilities
      SET outstanding_balance = outstanding_balance - princ,
          remaining_months = CASE
            WHEN remaining_months IS NULL THEN NULL
            ELSE GREATEST(remaining_months - (_sign)::int, 0)
          END
    WHERE id = _t.liability_id;
  END IF;

  IF _t.goal_id IS NOT NULL THEN
    UPDATE public.goals SET saved_amount = saved_amount + amt WHERE id = _t.goal_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tx_apply(public.transactions, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tx_effects_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.tx_apply(OLD, -1);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.tx_apply(NEW, 1);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.tx_effects_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_tx_effects ON public.transactions;
CREATE TRIGGER trg_tx_effects
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.tx_effects_trigger();