-- ============================================
-- PROFILES (1:1 with auth.users)
-- ============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  avatar_version integer not null default 0,
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
-- ROW LEVEL SECURITY
-- Both enabling RLS and granting base table access to `authenticated` are
-- required together — policies alone are not enough without this grant.
-- ============================================

alter table profiles enable row level security;
alter table roadmaps enable row level security;
alter table stages enable row level security;
alter table todos enable row level security;
alter table resumes enable row level security;

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on profiles, roadmaps, stages, todos, resumes
  to authenticated;

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

-- ============================================
-- RESUME STORAGE BUCKET
-- Private bucket: files are only readable via a signed URL the app requests,
-- not a public link.
-- ============================================

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Files are stored as "<user_id>/resume.pdf" — this checks that the first
-- path segment matches the requesting user's own auth.uid(), same "for all"
-- pattern as the table policies above.

create policy "Users manage own resume file"
on storage.objects for all
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- AVATAR STORAGE BUCKET
-- Public bucket: profile photos aren't sensitive, so we use a plain permanent
-- URL instead of a signed URL that needs re-requesting/expiry handling.
-- Writes are still locked to each user's own folder.
-- ============================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users manage own avatar file"
on storage.objects for all
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);