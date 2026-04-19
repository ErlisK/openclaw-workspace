-- Deduplicate lessons and add unique constraint on (course_id, slug).
-- This prevents duplicate lesson rows from re-imports and makes
-- upsert ON CONFLICT (course_id, slug) safe.

-- 1. Remove duplicate rows, keeping the oldest (lowest created_at).
delete from lessons
where id in (
  select id from (
    select id,
           row_number() over (
             partition by course_id, slug
             order by created_at asc nulls last
           ) as rn
    from lessons
  ) ranked
  where rn > 1
);

-- 2. Add unique constraint (idempotent via IF NOT EXISTS-style DO block).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lessons_course_slug_uniq'
  ) then
    alter table lessons
      add constraint lessons_course_slug_uniq unique (course_id, slug);
  end if;
end
$$;
