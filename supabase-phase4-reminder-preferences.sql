ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS morning_planning_email_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS end_of_day_digest_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_morning_planning_email_date date NULL,
ADD COLUMN IF NOT EXISTS last_end_of_day_digest_date date NULL;

UPDATE public.users
SET
  time_zone = COALESCE(NULLIF(BTRIM(time_zone), ''), 'UTC'),
  morning_planning_email_enabled = COALESCE(morning_planning_email_enabled, true),
  end_of_day_digest_enabled = COALESCE(end_of_day_digest_enabled, true)
WHERE TRUE;
