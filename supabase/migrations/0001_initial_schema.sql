-- WOER wiki: initial schema
-- Apply via Supabase Dashboard → SQL Editor → Run

-- ============================================================
-- Profiles (extends auth.users)
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read all"
  on public.profiles for select
  using (true);

create policy "profiles: user updates own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup (pulls name + avatar from Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Читатель'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin helper (used by RLS policies)
create or replace function public.is_admin()
returns boolean
language sql
stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ============================================================
-- Annotations (top-level comments tied to a page + text range)
-- ============================================================

create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  target jsonb not null,          -- W3C Web Annotation target (selectors)
  body_text text not null,
  quote text,                     -- highlighted snippet for UI
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index annotations_page_slug_idx on public.annotations(page_slug);
create index annotations_author_id_idx on public.annotations(author_id);

alter table public.annotations enable row level security;

create policy "annotations: read all"
  on public.annotations for select using (true);

create policy "annotations: authed insert own"
  on public.annotations for insert
  with check (auth.uid() = author_id);

create policy "annotations: author or admin updates"
  on public.annotations for update
  using (auth.uid() = author_id or public.is_admin());

create policy "annotations: author or admin deletes"
  on public.annotations for delete
  using (auth.uid() = author_id or public.is_admin());

-- ============================================================
-- Annotation replies (threaded comments)
-- ============================================================

create table public.annotation_replies (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid references public.annotations(id) on delete cascade not null,
  parent_reply_id uuid references public.annotation_replies(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index annotation_replies_annotation_id_idx on public.annotation_replies(annotation_id);
create index annotation_replies_parent_reply_id_idx on public.annotation_replies(parent_reply_id);

alter table public.annotation_replies enable row level security;

create policy "replies: read all"
  on public.annotation_replies for select using (true);

create policy "replies: authed insert own"
  on public.annotation_replies for insert
  with check (auth.uid() = author_id);

create policy "replies: author or admin updates"
  on public.annotation_replies for update
  using (auth.uid() = author_id or public.is_admin());

create policy "replies: author or admin deletes"
  on public.annotation_replies for delete
  using (auth.uid() = author_id or public.is_admin());

-- ============================================================
-- Auto-update updated_at on change
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger annotations_touch_updated_at
  before update on public.annotations
  for each row execute procedure public.touch_updated_at();

create trigger annotation_replies_touch_updated_at
  before update on public.annotation_replies
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- After first Google login of Nik — promote to admin manually:
--   update public.profiles set is_admin = true where id = '<Nik-uuid>';
-- Find the UUID via: select id, display_name from public.profiles;
-- ============================================================