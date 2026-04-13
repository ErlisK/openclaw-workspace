-- Migration: email unsubscribe fields + email_sends table
-- Idempotent (safe to re-run)

begin;

-- Add unsubscribe fields to waitlist_signups
alter table public.waitlist_signups add column if not exists unsubscribe_token text;
alter table public.waitlist_signups add column if not exists unsubscribed boolean not null default false;
alter table public.waitlist_signups add column if not exists unsubscribed_at timestamptz;

-- Unique index on unsubscribe_token (for fast lookup)
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'waitlist_unsubscribe_token_idx'
  ) then
    create unique index waitlist_unsubscribe_token_idx
      on public.waitlist_signups (unsubscribe_token);
  end if;
end $$;

-- Create email_sends logging table
create table if not exists public.email_sends (
  id          uuid        primary key default gen_random_uuid(),
  to_email    text        not null,
  template    text        not null,
  subject     text        not null,
  status      text        not null check (status in ('queued','sent','failed','skipped')),
  provider    text        default 'agentmail',
  response_id text,
  error       text,
  meta        jsonb       default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.email_sends enable row level security;

-- RLS policies (service_role bypasses; these allow anon reads if needed later)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_sends'
      and policyname = 'email_sends_select_all'
  ) then
    create policy "email_sends_select_all"
      on public.email_sends for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_sends'
      and policyname = 'email_sends_insert_all'
  ) then
    create policy "email_sends_insert_all"
      on public.email_sends for insert with check (true);
  end if;
end $$;

-- Index for idempotency check (to_email + template + created_at range query)
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'email_sends_to_template_created_idx'
  ) then
    create index email_sends_to_template_created_idx
      on public.email_sends (to_email, template, created_at desc);
  end if;
end $$;

commit;
