-- Seed a demo/test experiment for public page testing at /x/sample-experiment
-- Uses a synthetic user_id that won't match any real user, so it's safe in prod.
-- The anon RLS policy (experiments_anon_read_active_by_slug) allows public reads of active experiments.

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_product_id uuid;
  v_exp_id uuid;
begin
  -- Only seed if no experiment with this slug exists
  if exists (select 1 from public.experiments where slug = 'sample-experiment') then
    return;
  end if;

  -- Insert a synthetic product (will be orphaned from real auth.users, but FK is to profiles)
  -- Guard: only insert profile if it doesn't exist
  if not exists (select 1 from public.profiles where id = v_user_id) then
    insert into public.profiles (id, email, plan)
    values (v_user_id, 'demo@pricepilot.internal', 'free')
    on conflict (id) do nothing;
  end if;

  insert into public.products (user_id, name, platform, current_price_cents, currency)
  values (v_user_id, 'Pro Template Pack', 'manual', 4900, 'usd')
  returning id into v_product_id;

  insert into public.experiments (
    user_id, product_id, slug, status,
    variant_a_price_cents, variant_b_price_cents,
    split_pct_b,
    variant_a_label, variant_b_label,
    headline, description,
    cta_text, cta_url
  ) values (
    v_user_id, v_product_id, 'sample-experiment', 'active',
    4900, 7900,
    0.5,
    'Current price', 'New price',
    'Pro Template Pack',
    '50+ premium Notion & Figma templates for solo founders. Lifetime access.',
    'Get Pro Template Pack', '#'
  )
  returning id into v_exp_id;

  raise notice 'Seeded sample-experiment with id %', v_exp_id;
end$$;
