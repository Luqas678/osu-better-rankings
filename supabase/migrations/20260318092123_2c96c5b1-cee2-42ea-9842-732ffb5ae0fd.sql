CREATE TABLE public.ranking_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mode)
);

ALTER TABLE public.ranking_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ranking cache"
  ON public.ranking_cache FOR SELECT
  TO anon, authenticated
  USING (true);