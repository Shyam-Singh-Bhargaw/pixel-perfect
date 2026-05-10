create table public.company_prep_progress (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  question_id integer not null,
  company text not null default 'infosys',
  is_solved boolean not null default false,
  solved_at timestamptz,
  notes text,
  starred boolean not null default false,
  attempts integer not null default 0,
  updated_at timestamptz default now(),
  unique(user_id, question_id, company)
);

alter table public.company_prep_progress enable row level security;

create policy "Users can view own company_prep_progress"
  on public.company_prep_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own company_prep_progress"
  on public.company_prep_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own company_prep_progress"
  on public.company_prep_progress for update
  using (auth.uid() = user_id);

create policy "Users can delete own company_prep_progress"
  on public.company_prep_progress for delete
  using (auth.uid() = user_id);

create index idx_company_prep_progress_user on public.company_prep_progress(user_id, company);