
CREATE TABLE public.coding_practice (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT DEFAULT 'medium',
  note TEXT,
  date_solved DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.coding_practice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coding_practice" ON public.coding_practice FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coding_practice" ON public.coding_practice FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coding_practice" ON public.coding_practice FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own coding_practice" ON public.coding_practice FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.network_log ADD COLUMN IF NOT EXISTS contacted BOOLEAN DEFAULT false;
