-- =====================================================================================
-- The Button Box: database, security and storage
-- Run once in Supabase: SQL Editor > New query > paste all of this > Run.
-- Safe to run again: every statement checks before it creates.
--
-- Security model
--   * Every maker's rows carry user_id and row-level security (RLS) limits each maker to their own rows.
--   * A restrictive policy on every content table requires the second sign-in step (MFA, "aal2") while
--     app_settings.require_mfa is on (the default).
--   * Adding or changing rows needs access (billing off, a trial, an active subscription, or admin).
--     Reading and exporting always work, so a lapsed maker never loses their notes.
--   * Billing, connection tokens and settings are written only by the server (secret key) or by
--     admin-checked functions. Pattern files are never stored here: only links and details.
-- =====================================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ settings (one row)
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  billing_enabled boolean not null default false,
  require_mfa boolean not null default true,
  trial_days int not null default 14 check (trial_days between 0 and 90),
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------------ crafts (reference)
create table if not exists public.crafts (
  slug text primary key,
  name text not null,
  room text not null check (room in ('fabric','yarn','paper','studio')),
  sort int not null
);
insert into public.crafts (slug, name, room, sort) values
  ('sewing','Sewing and dressmaking','fabric',1),
  ('quilting','Quilting and patchwork','fabric',2),
  ('embroidery','Embroidery and cross-stitch','fabric',3),
  ('mending','Mending and sashiko','fabric',4),
  ('cosplay','Cosplay and costume','fabric',5),
  ('knitting','Knitting','yarn',6),
  ('crochet','Crochet','yarn',7),
  ('macrame','Macramé','yarn',8),
  ('weaving','Weaving','yarn',9),
  ('punch-needle','Punch needle','yarn',10),
  ('scrapbooking','Scrapbooking','paper',11),
  ('cards','Card making and junk journals','paper',12),
  ('cutting','Cutting machine projects','paper',13),
  ('jewellery','Jewellery and beading','studio',14),
  ('candles-soap','Candles and soap','studio',15),
  ('general','General crafts','studio',16)
on conflict (slug) do update set name = excluded.name, room = excluded.room, sort = excluded.sort;

-- ------------------------------------------------------------------ profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  units text not null default 'metric' check (units in ('metric','imperial')),
  favourite_room text check (favourite_room in ('fabric','yarn','paper','studio')),
  onboarded boolean not null default false,
  is_admin boolean not null default false,
  trial_ends_at timestamptz,
  join_fee_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ patterns and what they need
create table if not exists public.patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  designer text check (char_length(designer) <= 120),
  craft text references public.crafts(slug),
  project_type text,
  sizes_label text,
  skill_level text,
  material text,
  stretch_pct int check (stretch_pct between 0 and 200),
  weight_note text,
  seam_allowance text,
  description text check (char_length(description) <= 4000),
  cover_path text,
  cover_url text,
  source text not null default 'manual'
    check (source in ('manual','computer','onedrive','google','dropbox','ravelry','snap')),
  source_ref text,
  status text not null default 'owned' check (status in ('owned','wishlist')),
  pinned boolean not null default false,
  rating int check (rating between 0 and 5),
  size_chart jsonb,
  supplies jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  next_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists patterns_user_craft on public.patterns (user_id, craft);
create index if not exists patterns_user_updated on public.patterns (user_id, updated_at desc);

create table if not exists public.pattern_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pattern_id uuid not null references public.patterns(id) on delete cascade,
  name text not null,
  kind text not null default 'other'
    check (kind in ('instructions','print_home','copyshop','projector','zip','other')),
  provider text not null default 'computer'
    check (provider in ('computer','onedrive','google','dropbox','ravelry','link')),
  url text,
  provider_id text,
  pages int,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index if not exists pattern_files_pattern on public.pattern_files (pattern_id);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pattern_id uuid not null references public.patterns(id) on delete cascade,
  variation text,
  size_from text,
  size_to text,
  material text,
  amount numeric check (amount >= 0),
  unit text not null default 'm' check (unit in ('m','yd','cm','g','balls','skeins','sheets','each','ml')),
  width_cm numeric check (width_cm > 0),
  notes text,
  sort int not null default 0
);
create index if not exists requirements_pattern on public.requirements (pattern_id);

-- ------------------------------------------------------------------ planner
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  pattern_id uuid references public.patterns(id) on delete set null,
  craft text references public.crafts(slug),
  stage text not null default 'daydream'
    check (stage in ('daydream','planned','cut','making','finished','loved')),
  due_on date,
  for_whom text,
  size_plan text,
  variation text,
  notes text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_stage on public.projects (user_id, stage);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ stash
create table if not exists public.stash_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('fabric','thread','notion','interfacing','yarn','cord','fibre','paper',
    'embellishment','stamp','vinyl','bead','wax','oil','fragrance','tool','other')),
  room text not null check (room in ('fabric','yarn','paper','studio')),
  name text not null check (char_length(name) between 1 and 200),
  colour text,
  colour_hex text check (colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  fibre text,
  material text,
  width_cm numeric check (width_cm > 0),
  quantity numeric check (quantity >= 0),
  unit text not null default 'm' check (unit in ('m','yd','cm','g','balls','skeins','sheets','each','ml')),
  weight_gsm int check (weight_gsm > 0),
  stretch_pct int check (stretch_pct between 0 and 200),
  yarn_weight text,
  metres_per_unit numeric check (metres_per_unit > 0),
  dye_lot text,
  location text,
  notes text,
  photo_path text,
  snapped boolean not null default false,
  reserved_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stash_user_room on public.stash_items (user_id, room);

-- ------------------------------------------------------------------ makes journal
create table if not exists public.makes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pattern_id uuid references public.patterns(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  craft text references public.crafts(slug),
  finished_on date,
  size_made text,
  changes text,
  thoughts text,
  next_time text,
  would_make_again boolean,
  rating int check (rating between 0 and 5),
  stash_ids uuid[] not null default '{}',
  photo_path text,
  created_at timestamptz not null default now()
);
create index if not exists makes_user_pattern on public.makes (user_id, pattern_id);

-- ------------------------------------------------------------------ measurements
create table if not exists public.measurement_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  is_me boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.measurement_profiles(id) on delete cascade,
  taken_on date not null default current_date,
  bust numeric, high_bust numeric, waist numeric, hips numeric, height numeric, inseam numeric,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists measurements_profile on public.measurements (profile_id, taken_on desc);

-- ------------------------------------------------------------------ billing (server writes only)
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  price_id text,
  plan text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user on public.subscriptions (user_id, updated_at desc);

-- ------------------------------------------------------------------ connections (server writes only)
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('ravelry')),
  account_name text,
  token_enc text,
  refresh_enc text,
  expires_at timestamptz,
  last_import_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- ------------------------------------------------------------------ usage (fair use limits) and audit
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists usage_user_kind on public.usage_events (user_id, kind, created_at desc);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ links back to where things came from (imports)
alter table public.projects add column if not exists source_ref text;
alter table public.stash_items add column if not exists source_ref text;
alter table public.makes add column if not exists source_ref text;
create unique index if not exists patterns_source_ref on public.patterns (user_id, source_ref) where source_ref is not null;
create unique index if not exists projects_source_ref on public.projects (user_id, source_ref) where source_ref is not null;
create unique index if not exists stash_source_ref on public.stash_items (user_id, source_ref) where source_ref is not null;
create unique index if not exists makes_source_ref on public.makes (user_id, source_ref) where source_ref is not null;

-- =====================================================================================
-- Helper functions
-- =====================================================================================
create or replace function public.mfa_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not require_mfa from public.app_settings where id = 1), false)
      or coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;

create or replace function public.has_access() returns boolean
language sql stable security definer set search_path = public as $$
  select
    not coalesce((select billing_enabled from public.app_settings where id = 1), false)
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and (p.is_admin or p.trial_ends_at > now()))
    or exists (select 1 from public.subscriptions s
               where s.user_id = auth.uid()
                 and s.status in ('active','trialing','past_due')
                 and (s.current_period_end is null or s.current_period_end > now() - interval '3 days'));
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','patterns','projects','stash_items','subscriptions'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- A new maker gets a profile, a trial and a measurement profile called "Me"
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare d int;
begin
  select trial_days into d from public.app_settings where id = 1;
  insert into public.profiles (id, display_name, trial_ends_at)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name',
                  split_part(new.email, '@', 1)), 80),
    now() + make_interval(days => coalesce(d, 14))
  )
  on conflict (id) do nothing;
  insert into public.measurement_profiles (user_id, name, is_me) values (new.id, 'Me', true);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================================
-- Row-level security
-- =====================================================================================
alter table public.app_settings enable row level security;
alter table public.crafts enable row level security;
alter table public.profiles enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.connections enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "Settings: anyone can read" on public.app_settings;
create policy "Settings: anyone can read" on public.app_settings for select to anon, authenticated using (true);

drop policy if exists "Crafts: anyone can read" on public.crafts;
create policy "Crafts: anyone can read" on public.crafts for select to anon, authenticated using (true);

drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
drop policy if exists "Profiles: change own" on public.profiles;
create policy "Profiles: change own" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and public.mfa_ok())
  with check (id = (select auth.uid()) and public.mfa_ok());

drop policy if exists "Subscriptions: read own" on public.subscriptions;
create policy "Subscriptions: read own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Billing customer: read own" on public.billing_customers;
create policy "Billing customer: read own" on public.billing_customers for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Usage: read own" on public.usage_events;
create policy "Usage: read own" on public.usage_events for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Usage: add own" on public.usage_events;
create policy "Usage: add own" on public.usage_events for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Audit: admins read" on public.audit_log;
create policy "Audit: admins read" on public.audit_log for select to authenticated
  using (public.is_admin());

-- connections: no policies on purpose. Only the server (secret key) can read or write tokens.

-- Every maker-owned content table: own rows only, access to add or change, and the second step
do $$
declare t text;
begin
  foreach t in array array['patterns','pattern_files','requirements','projects','shopping_items',
                           'stash_items','makes','measurement_profiles','measurements'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%1$s: read own" on public.%1$I', t);
    execute format('create policy "%1$s: read own" on public.%1$I for select to authenticated
                    using (user_id = (select auth.uid()))', t);

    execute format('drop policy if exists "%1$s: add own" on public.%1$I', t);
    execute format('create policy "%1$s: add own" on public.%1$I for insert to authenticated
                    with check (user_id = (select auth.uid()) and public.has_access())', t);

    execute format('drop policy if exists "%1$s: change own" on public.%1$I', t);
    execute format('create policy "%1$s: change own" on public.%1$I for update to authenticated
                    using (user_id = (select auth.uid()))
                    with check (user_id = (select auth.uid()) and public.has_access())', t);

    execute format('drop policy if exists "%1$s: remove own" on public.%1$I', t);
    execute format('create policy "%1$s: remove own" on public.%1$I for delete to authenticated
                    using (user_id = (select auth.uid()))', t);

    execute format('drop policy if exists "%1$s: second step required" on public.%1$I', t);
    execute format('create policy "%1$s: second step required" on public.%1$I as restrictive
                    for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok())', t);
  end loop;
end $$;

-- Linked rows must point at the maker's own rows
drop policy if exists "pattern_files: own pattern" on public.pattern_files;
create policy "pattern_files: own pattern" on public.pattern_files as restrictive for all to authenticated
  using (true)
  with check (exists (select 1 from public.patterns p where p.id = pattern_id and p.user_id = (select auth.uid())));

drop policy if exists "requirements: own pattern" on public.requirements;
create policy "requirements: own pattern" on public.requirements as restrictive for all to authenticated
  using (true)
  with check (exists (select 1 from public.patterns p where p.id = pattern_id and p.user_id = (select auth.uid())));

drop policy if exists "measurements: own profile" on public.measurements;
create policy "measurements: own profile" on public.measurements as restrictive for all to authenticated
  using (true)
  with check (exists (select 1 from public.measurement_profiles m where m.id = profile_id and m.user_id = (select auth.uid())));

drop policy if exists "projects: own pattern" on public.projects;
create policy "projects: own pattern" on public.projects as restrictive for all to authenticated
  using (true)
  with check (pattern_id is null or exists (select 1 from public.patterns p where p.id = pattern_id and p.user_id = (select auth.uid())));

drop policy if exists "makes: own pattern" on public.makes;
create policy "makes: own pattern" on public.makes as restrictive for all to authenticated
  using (true)
  with check (pattern_id is null or exists (select 1 from public.patterns p where p.id = pattern_id and p.user_id = (select auth.uid())));

drop policy if exists "shopping_items: own project" on public.shopping_items;
create policy "shopping_items: own project" on public.shopping_items as restrictive for all to authenticated
  using (true)
  with check (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())));

drop policy if exists "stash_items: own project" on public.stash_items;
create policy "stash_items: own project" on public.stash_items as restrictive for all to authenticated
  using (true)
  with check (reserved_project_id is null or exists (select 1 from public.projects p where p.id = reserved_project_id and p.user_id = (select auth.uid())));

-- Defence in depth: makers can only change the profile columns that are theirs to change
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, units, favourite_room, onboarded) on public.profiles to authenticated;
revoke insert, update, delete on public.app_settings, public.crafts, public.subscriptions,
  public.billing_customers, public.connections, public.audit_log from anon, authenticated;
revoke all on public.connections from anon, authenticated;
revoke insert, update, delete on public.usage_events from anon;

-- =====================================================================================
-- Functions the app calls
-- =====================================================================================
create or replace function public.my_connections()
returns table (provider text, account_name text, last_import_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select provider, account_name, last_import_at, created_at from public.connections where user_id = auth.uid();
$$;

create or replace function public.count_recent_usage(p_kind text, p_minutes int default 60) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.usage_events
  where user_id = auth.uid() and kind = p_kind and created_at > now() - make_interval(mins => p_minutes);
$$;

create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return json_build_object(
    'makers', (select count(*) from public.profiles),
    'new_this_week', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'on_trial', (select count(*) from public.profiles where trial_ends_at > now()),
    'subscribed', (select count(*) from public.subscriptions where status in ('active','trialing')),
    'past_due', (select count(*) from public.subscriptions where status = 'past_due'),
    'cancelling', (select count(*) from public.subscriptions where cancel_at_period_end and status in ('active','trialing')),
    'monthly', (select count(*) from public.subscriptions where plan = 'monthly' and status in ('active','trialing')),
    'yearly', (select count(*) from public.subscriptions where plan = 'yearly' and status in ('active','trialing')),
    'patterns', (select count(*) from public.patterns),
    'makes', (select count(*) from public.makes),
    'stash_items', (select count(*) from public.stash_items),
    'settings', (select row_to_json(s) from public.app_settings s where id = 1)
  );
end $$;

create or replace function public.admin_update_settings(p_billing boolean, p_mfa boolean, p_trial int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Use your second sign-in step before changing settings';
  end if;
  update public.app_settings
     set billing_enabled = p_billing, require_mfa = p_mfa,
         trial_days = greatest(0, least(coalesce(p_trial, 14), 90)), updated_at = now()
   where id = 1;
  insert into public.audit_log (user_id, action, detail)
  values (auth.uid(), 'settings_changed',
          json_build_object('billing_enabled', p_billing, 'require_mfa', p_mfa, 'trial_days', p_trial)::jsonb);
end $$;

revoke execute on function public.admin_update_settings(boolean, boolean, int) from anon;
revoke execute on function public.admin_overview() from anon;

-- =====================================================================================
-- Private photo storage: maker-photos/<user id>/...
-- =====================================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maker-photos', 'maker-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Maker photos: read own" on storage.objects;
create policy "Maker photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'maker-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and public.mfa_ok());

drop policy if exists "Maker photos: add own" on storage.objects;
create policy "Maker photos: add own" on storage.objects for insert to authenticated
  with check (bucket_id = 'maker-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
              and public.mfa_ok() and public.has_access());

drop policy if exists "Maker photos: change own" on storage.objects;
create policy "Maker photos: change own" on storage.objects for update to authenticated
  using (bucket_id = 'maker-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and public.mfa_ok())
  with check (bucket_id = 'maker-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and public.mfa_ok());

drop policy if exists "Maker photos: remove own" on storage.objects;
create policy "Maker photos: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'maker-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and public.mfa_ok());

-- =====================================================================================
-- After running: make yourself the admin (replace the email), then sign out and back in.
--   update public.profiles set is_admin = true
--    where id = (select id from auth.users where email = 'you@example.com');
-- =====================================================================================
