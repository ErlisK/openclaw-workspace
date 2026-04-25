-- Launch gate fixes: RLS policy for anon experiment reads
-- Dedup index for observations (unique per visitor+event+experiment)

-- Allow anon to read active experiments (public experiment pages use anon key)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'experiments'
      and policyname = 'experiments_anon_read_active_by_slug'
  ) then
    execute 'create policy "experiments_anon_read_active_by_slug" on public.experiments for select to anon using (status = ''active'')';
  end if;
end$$;

-- Dedup index on observations (idempotent)
create unique index if not exists uq_obs_dedup
  on public.experiment_observations(experiment_id, visitor_key, event);
