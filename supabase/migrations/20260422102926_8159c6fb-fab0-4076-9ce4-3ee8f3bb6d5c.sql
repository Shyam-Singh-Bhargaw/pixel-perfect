ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS job_type text,
  ADD COLUMN IF NOT EXISTS salary text,
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'Applied',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]'::jsonb;

UPDATE public.job_applications
SET stage = COALESCE(stage, status, 'Applied')
WHERE stage IS NULL OR stage = 'Applied';