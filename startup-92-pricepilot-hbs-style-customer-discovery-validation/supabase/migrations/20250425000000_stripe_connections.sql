-- stripe_connections table with RLS
-- Stores encrypted Stripe API key per user

create table if not exists public.stripe_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  stripe_key_enc text not null,
  key_hint text,
  account_id text,
  account_name text,
  is_test_mode boolean not null default true,
  last_imported_at timestamptz,
  import_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.stripe_connections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_connections'
      and policyname = 'stripe_connections_all_own'
  ) then
    create policy stripe_connections_all_own on public.stripe_connections
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;
