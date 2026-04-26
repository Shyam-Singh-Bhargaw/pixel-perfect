
ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS raw_description text,
  ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nice_to_have jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS responsibilities jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interview_focus jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience text;
