CREATE OR REPLACE FUNCTION public.tx_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

  RETURN NEW;
END;
$function$;