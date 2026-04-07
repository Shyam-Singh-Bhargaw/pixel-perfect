
-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  text TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('high','med','low')) DEFAULT 'med',
  done BOOLEAN DEFAULT false,
  date DATE DEFAULT current_date,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Create revision_items table
CREATE TABLE public.revision_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  text TEXT NOT NULL,
  topic TEXT DEFAULT 'General',
  added_date DATE DEFAULT current_date,
  next_rev DATE DEFAULT current_date,
  rev_count INTEGER DEFAULT 0,
  rev_dates DATE[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.revision_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own revision_items" ON public.revision_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revision_items" ON public.revision_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revision_items" ON public.revision_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own revision_items" ON public.revision_items FOR DELETE USING (auth.uid() = user_id);

-- Create study_hours table
CREATE TABLE public.study_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE DEFAULT current_date,
  topic TEXT NOT NULL,
  hours NUMERIC(4,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.study_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own study_hours" ON public.study_hours FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study_hours" ON public.study_hours FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study_hours" ON public.study_hours FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study_hours" ON public.study_hours FOR DELETE USING (auth.uid() = user_id);

-- Create daily_checkins table
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE DEFAULT current_date,
  mood TEXT,
  notes TEXT,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily_checkins" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_checkins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_checkins" ON public.daily_checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily_checkins" ON public.daily_checkins FOR DELETE USING (auth.uid() = user_id);

-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT CHECK (status IN ('Applied','Interview','Offer','Rejected')) DEFAULT 'Applied',
  applied_date DATE DEFAULT current_date,
  notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own job_applications" ON public.job_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own job_applications" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own job_applications" ON public.job_applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own job_applications" ON public.job_applications FOR DELETE USING (auth.uid() = user_id);

-- Create network_log table
CREATE TABLE public.network_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  platform TEXT,
  note TEXT,
  next_action TEXT,
  date DATE DEFAULT current_date,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.network_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own network_log" ON public.network_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own network_log" ON public.network_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own network_log" ON public.network_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own network_log" ON public.network_log FOR DELETE USING (auth.uid() = user_id);

-- Create ai_chat_history table
CREATE TABLE public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_date DATE DEFAULT current_date,
  role TEXT CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  context_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ai_chat_history" ON public.ai_chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_chat_history" ON public.ai_chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_chat_history" ON public.ai_chat_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_chat_history" ON public.ai_chat_history FOR DELETE USING (auth.uid() = user_id);

-- Create user_progress table for study plan checkbox state
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  studied_subtopics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own user_progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);
