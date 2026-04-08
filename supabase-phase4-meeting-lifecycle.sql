-- Phase 4 meeting lifecycle foundation

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS meeting_end_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS capture_method TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS audio_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS transcript_file_id UUID NULL REFERENCES public.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS summary_file_id UUID NULL REFERENCES public.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS notified_post_meeting_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS dismissed_post_meeting_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS included_in_daily_digest_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_lifecycle_evaluated_at TIMESTAMPTZ NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'last_completion_prompted_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'notified_post_meeting_at'
  ) THEN
    ALTER TABLE public.meetings
      RENAME COLUMN last_completion_prompted_at TO notified_post_meeting_at;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'last_daily_digest_sent_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'included_in_daily_digest_at'
  ) THEN
    ALTER TABLE public.meetings
      RENAME COLUMN last_daily_digest_sent_at TO included_in_daily_digest_at;
  END IF;
END $$;

ALTER TABLE public.meetings
  DROP CONSTRAINT IF EXISTS meetings_status_check;

ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IN ('scheduled', 'completed', 'captured', 'missing'));

ALTER TABLE public.meetings
  DROP CONSTRAINT IF EXISTS meetings_capture_method_check;

ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_capture_method_check
  CHECK (capture_method IN ('none', 'recording', 'written_notes', 'dictated_notes'));

CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_end_at ON public.meetings(meeting_end_at);
CREATE INDEX IF NOT EXISTS idx_meetings_notified_post_meeting_at ON public.meetings(notified_post_meeting_at);
CREATE INDEX IF NOT EXISTS idx_meetings_dismissed_post_meeting_at ON public.meetings(dismissed_post_meeting_at);
CREATE INDEX IF NOT EXISTS idx_meetings_included_in_daily_digest_at ON public.meetings(included_in_daily_digest_at);

UPDATE public.meetings
SET
  status = CASE
    WHEN status IS NOT NULL AND status IN ('scheduled', 'completed', 'captured', 'missing') THEN status
    WHEN processing_status IS NOT NULL AND processing_status <> 'uploaded' THEN 'captured'
    ELSE 'scheduled'
  END,
  capture_method = CASE
    WHEN capture_method IS NOT NULL AND capture_method IN ('none', 'recording', 'written_notes', 'dictated_notes') THEN capture_method
    WHEN processing_status IS NOT NULL AND processing_status <> 'uploaded' THEN 'recording'
    ELSE 'none'
  END,
  completed_at = CASE
    WHEN completed_at IS NOT NULL THEN completed_at
    WHEN processing_status = 'completed' THEN COALESCE(updated_at, created_at, NOW())
    ELSE NULL
  END,
  meeting_end_at = COALESCE(meeting_end_at, meeting_start_at),
  audio_deleted = COALESCE(audio_deleted, FALSE)
WHERE TRUE;
