CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.mini_pc_tokens (
  token_hash text PRIMARY KEY,
  mini_pc_id uuid NOT NULL REFERENCES public.mini_pcs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS mini_pc_tokens_one_active_per_mini_pc
ON public.mini_pc_tokens (mini_pc_id)
WHERE revoked_at IS NULL;

ALTER TABLE public.mini_pcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_pc_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_pc_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mini pcs" ON public.mini_pcs;
DROP POLICY IF EXISTS "Users can view their own mini pc health" ON public.mini_pc_health;
DROP POLICY IF EXISTS "Users can view their own camera health" ON public.camera_health;
DROP POLICY IF EXISTS "Users can view their own support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Users can manage their own support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Public can insert subscription requests" ON public.subscription_requests;

CREATE POLICY "Users can view their own mini pcs"
ON public.mini_pcs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own mini pc health"
ON public.mini_pc_health
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.mini_pcs mp
    WHERE mp.id = mini_pc_health.mini_pc_id
      AND mp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own camera health"
ON public.camera_health
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.cameras c
    WHERE c.id = camera_health.camera_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own support requests"
ON public.support_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own support requests"
ON public.support_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DELETE FROM public.mini_pc_health mph
USING public.mini_pc_health mph2
WHERE mph.mini_pc_id = mph2.mini_pc_id
  AND mph.created_at < mph2.created_at;

DELETE FROM public.camera_health ch
USING public.camera_health ch2
WHERE ch.camera_id = ch2.camera_id
  AND ch.created_at < ch2.created_at;

ALTER TABLE public.mini_pc_health
ADD CONSTRAINT IF NOT EXISTS mini_pc_health_mini_pc_id_key UNIQUE (mini_pc_id);

ALTER TABLE public.camera_health
ADD CONSTRAINT IF NOT EXISTS camera_health_camera_id_key UNIQUE (camera_id);
