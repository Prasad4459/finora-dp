CREATE OR REPLACE FUNCTION public.tx_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  c_kind public.category_kind;
  c_name text;
BEGIN
  IF NEW.type = 'transfer' AND NEW.to_wallet_id IS NULL THEN
    RAISE EXCEPTION 'A transfer must have a destination account';
  END IF;
  IF NEW.type = 'transfer' AND NEW.to_wallet_id = NEW.wallet_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be different';
  END IF;

  IF NEW.type IN ('income','expense','refund','dividend','emi','transfer','redemption')
     AND NEW.wallet_id IS NULL THEN
    RAISE EXCEPTION 'Select an account for this transaction (% requires a wallet)', NEW.type;
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT kind, name INTO c_kind, c_name FROM public.categories WHERE id = NEW.category_id;
  END IF;

  IF NEW.type = 'income' THEN
    IF c_name IS NOT NULL AND lower(c_name) = 'refund' THEN
      RAISE EXCEPTION 'Refunds cannot be recorded as income. Use the Record refund action instead.';
    END IF;
    IF c_kind IS NOT NULL AND c_kind = 'expense' THEN
      RAISE EXCEPTION 'Income must use an income category (% is an expense category)', c_name;
    END IF;
  END IF;

  IF NEW.type = 'refund' THEN
    IF NEW.category_id IS NULL THEN
      RAISE EXCEPTION 'A refund must reference the original expense category';
    END IF;
    IF c_kind NOT IN ('expense','both') OR lower(c_name) = 'refund' THEN
      RAISE EXCEPTION 'A refund must use an expense category (got %)', COALESCE(c_name, 'none');
    END IF;
  END IF;

  -- LOAN REPAYMENTS ARE ALWAYS LINKED TO THE LOAN.
  -- An EMI must name the liability it repays, otherwise the outstanding
  -- balance would silently never move.
  IF NEW.type = 'emi' AND NEW.liability_id IS NULL THEN
    RAISE EXCEPTION 'Select the loan this EMI payment repays';
  END IF;

  -- A plain expense may never carry a liability: that would debit the wallet
  -- without reducing the loan. It must be recorded as an EMI payment.
  IF NEW.type = 'expense' AND NEW.liability_id IS NOT NULL THEN
    RAISE EXCEPTION 'Record this as an EMI payment so the loan balance is reduced';
  END IF;

  -- Principal + interest can never exceed the instalment paid.
  IF NEW.type = 'emi'
     AND COALESCE(NEW.principal_amount, 0) + COALESCE(NEW.interest_amount, 0) > COALESCE(NEW.amount, 0) + 0.5 THEN
    RAISE EXCEPTION 'Principal plus interest cannot exceed the EMI amount';
  END IF;

  RETURN NEW;
END;
$function$;