ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES public.bills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bill_occurrence_date date;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_bill_occurrence_pair_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_bill_occurrence_pair_check
  CHECK ((bill_id IS NULL) = (bill_occurrence_date IS NULL));

UPDATE public.transactions t
   SET bill_id = bp.bill_id,
       bill_occurrence_date = bp.due_date
  FROM public.bill_payments bp
 WHERE bp.transaction_id = t.id
   AND (t.bill_id IS NULL OR t.bill_occurrence_date IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_bill_occurrence_uidx
  ON public.transactions (bill_id, bill_occurrence_date)
  WHERE bill_id IS NOT NULL AND bill_occurrence_date IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bill_payments_bill_due_date_uidx
  ON public.bill_payments (bill_id, due_date);

REVOKE INSERT, UPDATE, DELETE ON public.bill_payments FROM authenticated;
GRANT SELECT ON public.bill_payments TO authenticated;
GRANT ALL ON public.bill_payments TO service_role;

DROP FUNCTION IF EXISTS public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date);

CREATE FUNCTION public.pay_bill_occurrence(
  _bill_id uuid,
  _occurrence_date date,
  _amount numeric,
  _wallet_id uuid,
  _paid_date date,
  _next_due_date date DEFAULT NULL
)
RETURNS TABLE(created boolean, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bill public.bills%ROWTYPE;
  v_payment_id uuid;
  v_transaction_id uuid;
  v_period_key text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to pay a bill';
  END IF;
  IF _occurrence_date IS NULL THEN
    RAISE EXCEPTION 'Bill occurrence date is required';
  END IF;
  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Select an account for this transaction';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Enter a valid payment amount';
  END IF;
  IF _paid_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required';
  END IF;

  v_period_key := _occurrence_date::text;

  SELECT *
    INTO v_bill
    FROM public.bills
   WHERE id = _bill_id
     AND user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  -- A retry for an already-claimed occurrence exits before any ledger write.
  IF EXISTS (
    SELECT 1
      FROM public.bill_payments
     WHERE bill_id = _bill_id
       AND due_date = _occurrence_date
  ) OR EXISTS (
    SELECT 1
      FROM public.transactions
     WHERE bill_id = _bill_id
       AND bill_occurrence_date = _occurrence_date
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  -- The current bill definition must still point at the occurrence supplied by
  -- the client. Waiting concurrent requests therefore cannot pay the next cycle.
  IF v_bill.due_date IS DISTINCT FROM _occurrence_date
     OR (NOT v_bill.is_recurring AND v_bill.status = 'paid'::public.bill_status) THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.wallets
     WHERE id = _wallet_id
       AND user_id = v_user_id
       AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Select a valid active account';
  END IF;

  INSERT INTO public.bill_payments (
    user_id, bill_id, transaction_id, period_key, due_date,
    expected_amount, paid_amount, paid_date
  ) VALUES (
    v_user_id, v_bill.id, NULL, v_period_key, _occurrence_date,
    v_bill.amount, _amount, _paid_date
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.transactions (
    user_id, wallet_id, category_id, type, amount, transaction_date,
    payee, notes, status, is_recurring, bill_id, bill_occurrence_date
  ) VALUES (
    v_user_id, _wallet_id, v_bill.category_id,
    'expense'::public.transaction_type, _amount, _paid_date,
    v_bill.name, 'Bill payment — ' || v_bill.name,
    'completed'::public.transaction_status, false, v_bill.id, _occurrence_date
  )
  ON CONFLICT (bill_id, bill_occurrence_date)
    WHERE bill_id IS NOT NULL AND bill_occurrence_date IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_transaction_id;

  IF v_transaction_id IS NULL THEN
    DELETE FROM public.bill_payments WHERE id = v_payment_id;
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  UPDATE public.bill_payments
     SET transaction_id = v_transaction_id
   WHERE id = v_payment_id;

  IF v_bill.is_recurring THEN
    IF _next_due_date IS NULL OR _next_due_date <= _occurrence_date THEN
      RAISE EXCEPTION 'A recurring bill requires a valid next due date';
    END IF;
    UPDATE public.bills
       SET last_paid_date = _paid_date,
           due_date = _next_due_date,
           status = 'upcoming'::public.bill_status
     WHERE id = v_bill.id;
  ELSE
    UPDATE public.bills
       SET last_paid_date = _paid_date,
           status = 'paid'::public.bill_status
     WHERE id = v_bill.id;
  END IF;

  RETURN QUERY SELECT true, v_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date) TO service_role;