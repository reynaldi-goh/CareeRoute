-- ============================================
-- PROFILES (1:1 with auth.users)
-- ============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  birthday date,
  notifications_enabled boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- ROADMAPS (1 per user, or many if goal switching allowed)
-- ============================================
create table roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  goal text not null,
  created_at timestamptz default now()
);

-- ============================================
-- STAGES (many per roadmap)
-- ============================================
create table stages (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references roadmaps(id) on delete cascade,
  title text not null,
  order_index int not null
);

-- ============================================
-- TODOS (many per stage)
-- ============================================
create table todos (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  title text not null,
  completed boolean default false,
  order_index int not null
);

-- ============================================
-- RESUMES
-- ============================================
create table resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  file_url text,
  extracted_text text,
  match_score int,
  feedback jsonb,
  uploaded_at timestamptz default now()
);

-- ============================================
-- AUTO-CREATE A PROFILE ROW WHEN A USER SIGNS UP
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- profiles
create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- roadmaps
create policy "Users manage own roadmaps"
  on roadmaps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- stages (via parent roadmap)
create policy "Users manage own stages"
  on stages for all
  using (
    exists (select 1 from roadmaps where roadmaps.id = stages.roadmap_id and roadmaps.user_id = auth.uid())
  )
  with check (
    exists (select 1 from roadmaps where roadmaps.id = stages.roadmap_id and roadmaps.user_id = auth.uid())
  );

-- todos (via stage -> roadmap)
create policy "Users manage own todos"
  on todos for all
  using (
    exists (
      select 1 from stages
      join roadmaps on roadmaps.id = stages.roadmap_id
      where stages.id = todos.stage_id and roadmaps.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from stages
      join roadmaps on roadmaps.id = stages.roadmap_id
      where stages.id = todos.stage_id and roadmaps.user_id = auth.uid()
    )
  );

-- resumes
create policy "Users manage own resumes"
  on resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);