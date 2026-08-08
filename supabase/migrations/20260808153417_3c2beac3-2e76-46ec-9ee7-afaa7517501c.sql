-- 1. Ownership is derived from the session, never trusted from the client.
CREATE OR REPLACE FUNCTION public.enforce_row_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF uid IS NOT NULL THEN
      NEW.user_id := uid;
    ELSIF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'user_id is required';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Record ownership cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wallets','categories','transactions','assets','asset_valuations','liabilities',
    'goals','budgets','bills','bill_payments','notifications','investment_contributions',
    'profiles','user_settings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_owner_%1$s ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_owner_%1$s BEFORE INSERT OR UPDATE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_row_owner()', t);
  END LOOP;
END $$;

-- 2. Referenced rows must belong to the same owner (no FK-based cross-user access).
CREATE OR REPLACE FUNCTION public.assert_same_owner(_table text, _id uuid, _owner uuid, _label text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ok boolean;
BEGIN
  IF _id IS NULL THEN RETURN; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1 AND user_id = $2)', _table)
    INTO ok USING _id, _owner;
  IF NOT ok THEN
    RAISE EXCEPTION 'Invalid % reference', _label USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_same_owner(text, uuid, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tx_assert_refs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_same_owner('wallets', NEW.wallet_id, NEW.user_id, 'account');
  PERFORM public.assert_same_owner('wallets', NEW.to_wallet_id, NEW.user_id, 'destination account');
  PERFORM public.assert_same_owner('categories', NEW.category_id, NEW.user_id, 'category');
  PERFORM public.assert_same_owner('assets', NEW.asset_id, NEW.user_id, 'investment');
  PERFORM public.assert_same_owner('liabilities', NEW.liability_id, NEW.user_id, 'loan');
  PERFORM public.assert_same_owner('goals', NEW.goal_id, NEW.user_id, 'goal');
  PERFORM public.assert_same_owner('bills', NEW.bill_id, NEW.user_id, 'bill');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tx_assert_refs ON public.transactions;
CREATE TRIGGER trg_tx_assert_refs BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.tx_assert_refs();

CREATE OR REPLACE FUNCTION public.bills_assert_refs()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.assert_same_owner('wallets', NEW.wallet_id, NEW.user_id, 'account');
  PERFORM public.assert_same_owner('categories', NEW.category_id, NEW.user_id, 'category');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bills_assert_refs ON public.bills;
CREATE TRIGGER trg_bills_assert_refs BEFORE INSERT OR UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.bills_assert_refs();

CREATE OR REPLACE FUNCTION public.bill_payments_assert_refs()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.assert_same_owner('bills', NEW.bill_id, NEW.user_id, 'bill');
  PERFORM public.assert_same_owner('transactions', NEW.transaction_id, NEW.user_id, 'transaction');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bill_payments_assert_refs ON public.bill_payments;
CREATE TRIGGER trg_bill_payments_assert_refs BEFORE INSERT OR UPDATE ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.bill_payments_assert_refs();

CREATE OR REPLACE FUNCTION public.budgets_assert_refs()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.assert_same_owner('categories', NEW.category_id, NEW.user_id, 'category');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_budgets_assert_refs ON public.budgets;
CREATE TRIGGER trg_budgets_assert_refs BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.budgets_assert_refs();

CREATE OR REPLACE FUNCTION public.assets_assert_refs()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.assert_same_owner('wallets', NEW.linked_wallet_id, NEW.user_id, 'account');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_assets_assert_refs ON public.assets;
CREATE TRIGGER trg_assets_assert_refs BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_assert_refs();

CREATE OR REPLACE FUNCTION public.asset_valuations_assert_refs()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.assert_same_owner('assets', NEW.asset_id, NEW.user_id, 'investment');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_asset_valuations_assert_refs ON public.asset_valuations;
CREATE TRIGGER trg_asset_valuations_assert_refs BEFORE INSERT OR UPDATE ON public.asset_valuations
  FOR EACH ROW EXECUTE FUNCTION public.asset_valuations_assert_refs();

CREATE OR REPLACE FUNCTION public.investment_contributions_assert_refs()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.assert_same_owner('assets', NEW.asset_id, NEW.user_id, 'investment');
  PERFORM public.assert_same_owner('wallets', NEW.wallet_id, NEW.user_id, 'account');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_ic_assert_refs ON public.investment_contributions;
CREATE TRIGGER trg_ic_assert_refs BEFORE INSERT OR UPDATE ON public.investment_contributions
  FOR EACH ROW EXECUTE FUNCTION public.investment_contributions_assert_refs();

CREATE OR REPLACE FUNCTION public.liabilities_assert_refs()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.assert_same_owner('wallets', NEW.wallet_id, NEW.user_id, 'account');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_liabilities_assert_refs ON public.liabilities;
CREATE TRIGGER trg_liabilities_assert_refs BEFORE INSERT OR UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.liabilities_assert_refs();

-- 3. Signup: name + currency, always for the new auth user only.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_currency text := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'currency', ''), 'INR');
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, currency)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url', v_currency)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_settings (user_id, currency)
  VALUES (NEW.id, v_currency)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.categories (user_id, name, kind, is_default)
  SELECT NEW.id, c.name, c.kind::public.category_kind, true
  FROM (VALUES
    ('Salary','income'),('Bonus','income'),('Freelancing','income'),('Business','income'),
    ('Rental Income','income'),('Interest','income'),('Dividend','income'),('Cashback','income'),
    ('Refund','income'),('Gift','income'),
    ('Groceries','expense'),('Rent','expense'),('Electricity','expense'),('Water','expense'),
    ('LPG Gas','expense'),('Internet','expense'),('Mobile Recharge','expense'),('Fuel','expense'),
    ('Food','expense'),('Shopping','expense'),('Medical','expense'),('Education','expense'),
    ('Entertainment','expense'),('Travel','expense'),('Insurance','expense'),('Investment','expense'),
    ('EMI','expense'),('Others','expense')
  ) AS c(name, kind)
  ON CONFLICT (user_id, name, kind) DO NOTHING;

  RETURN NEW;
END;
$$;