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

  -- CASH-MOVING TRANSACTIONS MUST NAME AN ACCOUNT.
  -- 'investment' is deliberately excluded: employer-funded EPF / NPS
  -- contributions grow the asset without any wallet movement.
  IF NEW.type IN ('income','expense','refund','dividend','emi','transfer','redemption')
     AND NEW.wallet_id IS NULL THEN
    RAISE EXCEPTION 'Select an account for this transaction (% requires a wallet)', NEW.type;
  END IF;

  -- TYPE / CATEGORY SEMANTICS.
  -- Only income and refund are constrained; every other type keeps its
  -- existing (unconstrained) behaviour.
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

  RETURN NEW;
END;
$function$;