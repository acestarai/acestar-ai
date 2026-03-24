-- Create files table for tracking user uploads
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('audio', 'transcript', 'summary')),
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  duration TEXT,
  
  -- Metadata
  has_transcript BOOLEAN DEFAULT FALSE,
  has_summary BOOLEAN DEFAULT FALSE,
  speaker_diarization BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_file_type CHECK (file_type IN ('audio', 'transcript', 'summary'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON public.files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_user_type ON public.files(user_id, file_type);

-- Create updated_at trigger
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for files table
-- Users can only see their own files
CREATE POLICY "Users can view own files"
  ON public.files
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Users can insert their own files
CREATE POLICY "Users can insert own files"
  ON public.files
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own files
CREATE POLICY "Users can update own files"
  ON public.files
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON public.files
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Grant permissions
GRANT ALL ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;

-- Made with Bob
