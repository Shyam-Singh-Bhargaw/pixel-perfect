
CREATE TABLE public.study_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  source_title TEXT,
  category TEXT DEFAULT 'Other',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study_notes" ON public.study_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study_notes" ON public.study_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study_notes" ON public.study_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study_notes" ON public.study_notes FOR DELETE USING (auth.uid() = user_id);
