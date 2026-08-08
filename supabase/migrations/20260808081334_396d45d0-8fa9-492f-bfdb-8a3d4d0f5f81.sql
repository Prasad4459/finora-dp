ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'etf';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'bond';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'reit';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'invit';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'recurring_deposit';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'sukanya_samriddhi';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'nsc';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'kvp';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'scss';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'post_office';

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS units numeric,
  ADD COLUMN IF NOT EXISTS avg_cost numeric,
  ADD COLUMN IF NOT EXISTS last_price numeric,
  ADD COLUMN IF NOT EXISTS last_price_at timestamptz,
  ADD COLUMN IF NOT EXISTS interest_rate numeric,
  ADD COLUMN IF NOT EXISTS compounding text,
  ADD COLUMN IF NOT EXISTS maturity_date date,
  ADD COLUMN IF NOT EXISTS maturity_value numeric,
  ADD COLUMN IF NOT EXISTS folio_number text,
  ADD COLUMN IF NOT EXISTS linked_wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.investment_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  frequency public.bill_frequency NOT NULL DEFAULT 'monthly',
  next_due_date date NOT NULL DEFAULT CURRENT_DATE,
  day_of_month integer,
  auto_debit boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_contributions TO authenticated;
GRANT ALL ON public.investment_contributions TO service_role;
ALTER TABLE public.investment_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_contributions_select_own ON public.investment_contributions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY investment_contributions_insert_own ON public.investment_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY investment_contributions_update_own ON public.investment_contributions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY investment_contributions_delete_own ON public.investment_contributions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_investment_contributions_updated BEFORE UPDATE ON public.investment_contributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_investment_contributions_user_due ON public.investment_contributions(user_id, next_due_date);

CREATE TABLE IF NOT EXISTS public.asset_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  as_of date NOT NULL DEFAULT CURRENT_DATE,
  value numeric NOT NULL DEFAULT 0,
  units numeric,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, as_of)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_valuations TO authenticated;
GRANT ALL ON public.asset_valuations TO service_role;
ALTER TABLE public.asset_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_valuations_select_own ON public.asset_valuations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY asset_valuations_insert_own ON public.asset_valuations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY asset_valuations_update_own ON public.asset_valuations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY asset_valuations_delete_own ON public.asset_valuations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_asset_valuations_updated BEFORE UPDATE ON public.asset_valuations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_asset_valuations_asset_asof ON public.asset_valuations(asset_id, as_of DESC);