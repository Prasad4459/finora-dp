CREATE OR REPLACE FUNCTION public.assert_same_owner(_table text, _id uuid, _owner uuid, _label text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
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

GRANT EXECUTE ON FUNCTION public.assert_same_owner(text, uuid, uuid, text) TO authenticated, service_role;