-- Creator partnership inquiries table
create table if not exists public.creator_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  platform text,
  audience_size text,
  message text,
  created_at timestamptz default now()
);

alter table public.creator_inquiries enable row level security;

-- Only service role can access (admin only)
create policy "service_role_only" on public.creator_inquiries
  for all using (false);
