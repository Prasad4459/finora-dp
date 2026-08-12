ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS symbol text,
  ADD COLUMN IF NOT EXISTS exchange text,
  ADD COLUMN IF NOT EXISTS price_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS price_unit text NOT NULL DEFAULT 'per_unit';

ALTER TABLE public.assets
  ADD CONSTRAINT assets_price_source_chk
  CHECK (price_source IN ('nse','bse','amfi','gold_inr','manual'));

ALTER TABLE public.assets
  ADD CONSTRAINT assets_price_unit_chk
  CHECK (price_unit IN ('per_unit','per_gram'));

CREATE INDEX IF NOT EXISTS assets_symbol_idx ON public.assets (user_id, symbol) WHERE symbol IS NOT NULL;