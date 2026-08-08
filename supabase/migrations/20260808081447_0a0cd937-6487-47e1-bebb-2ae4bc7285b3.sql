ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'redemption';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS units numeric,
  ADD COLUMN IF NOT EXISTS price_per_unit numeric;

CREATE OR REPLACE FUNCTION public.tx_apply(_t transactions, _sign numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  amt numeric := COALESCE(_t.amount, 0) * _sign;
  u numeric := COALESCE(_t.units, 0) * _sign;
  princ numeric;
  cost_out numeric;
  a_units numeric;
  a_cost numeric;
BEGIN
  IF _t.status IS DISTINCT FROM 'completed'::public.transaction_status THEN
    RETURN;
  END IF;

  IF _t.type::text IN ('income', 'refund', 'dividend', 'redemption') THEN
    IF _t.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + amt WHERE id = _t.wallet_id;
    END IF;
  ELSIF _t.type::text IN ('expense', 'investment', 'emi') THEN
    IF _t.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - amt WHERE id = _t.wallet_id;
    END IF;
  ELSIF _t.type::text = 'transfer' THEN
    IF _t.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - amt WHERE id = _t.wallet_id;
    END IF;
    IF _t.to_wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + amt WHERE id = _t.to_wallet_id;
    END IF;
  END IF;

  IF _t.type::text = 'investment' AND _t.asset_id IS NOT NULL THEN
    UPDATE public.assets
      SET current_value = current_value + amt,
          purchase_value = purchase_value + amt,
          units = CASE WHEN _t.units IS NULL THEN units ELSE COALESCE(units, 0) + u END
    WHERE id = _t.asset_id
    RETURNING units, purchase_value INTO a_units, a_cost;

    IF _t.units IS NOT NULL THEN
      UPDATE public.assets
        SET avg_cost = CASE WHEN COALESCE(a_units, 0) > 0 THEN a_cost / a_units ELSE NULL END
      WHERE id = _t.asset_id;
    END IF;
  END IF;

  IF _t.type::text = 'redemption' AND _t.asset_id IS NOT NULL THEN
    SELECT avg_cost INTO a_cost FROM public.assets WHERE id = _t.asset_id;
    cost_out := CASE
      WHEN _t.units IS NOT NULL AND a_cost IS NOT NULL THEN a_cost * COALESCE(_t.units, 0) * _sign
      ELSE amt
    END;
    UPDATE public.assets
      SET current_value = GREATEST(current_value - amt, 0),
          purchase_value = GREATEST(purchase_value - cost_out, 0),
          units = CASE WHEN _t.units IS NULL THEN units ELSE GREATEST(COALESCE(units, 0) - u, 0) END
    WHERE id = _t.asset_id;
  END IF;

  IF _t.type::text = 'emi' AND _t.liability_id IS NOT NULL THEN
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
$function$;