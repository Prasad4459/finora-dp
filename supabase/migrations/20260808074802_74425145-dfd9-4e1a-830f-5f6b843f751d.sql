ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE IF NOT EXISTS public.bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  period_key text NOT NULL,
  due_date date NOT NULL,
  expected_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (bill_id, period_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_payments TO authenticated;
GRANT ALL ON public.bill_payments TO service_role;

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_payments_select_own" ON public.bill_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bill_payments_insert_own" ON public.bill_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bill_payments_update_own" ON public.bill_payments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bill_payments_delete_own" ON public.bill_payments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bill_payments_bill ON public.bill_payments(bill_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_bill_payments_user ON public.bill_payments(user_id, paid_date DESC);

CREATE TRIGGER trg_bill_payments_updated BEFORE UPDATE ON public.bill_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;