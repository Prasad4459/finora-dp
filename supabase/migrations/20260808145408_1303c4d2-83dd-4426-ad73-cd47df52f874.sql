GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_payments TO authenticated;
GRANT ALL ON public.bill_payments TO service_role;

ALTER FUNCTION public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_bill_occurrence(uuid, date, numeric, uuid, date, date) TO service_role;