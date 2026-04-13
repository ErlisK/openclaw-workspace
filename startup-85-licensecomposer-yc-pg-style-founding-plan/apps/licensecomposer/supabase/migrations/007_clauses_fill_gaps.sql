-- Migration: 007_clauses_fill_gaps.sql
-- 1. Add 1 asset_license clause (brings to 12)
-- 2. Add 1 collaboration clause (brings to 12)
-- 3. Backfill jurisdiction_codes on all rows missing it
-- 4. Backfill risk_notes on remaining rows missing it

-- ── 1. Missing asset_license clause ──────────────────────────────────
INSERT INTO public.clauses
  (slug, title, category, plain_english, legal_text,
   applies_to, jurisdiction_codes, platform_codes, tags,
   risk_notes, is_required, is_active, lawyer_reviewed, version,
   vetting_status, sort_order)
VALUES
(
  'asset-license-resale-prohibition',
  'No Standalone Resale of Assets',
  'asset_license',
  'You can use these assets in your games, apps, or designs. But you cannot package them up and sell them as a standalone asset pack or collection — they have to be part of a bigger product you made.',
  'Licensee shall not redistribute, resell, sublicense, or make available the Licensed Assets (or any derivative thereof) as standalone files, asset bundles, or competing asset libraries, whether commercially or free of charge. The Licensed Assets may only be incorporated into a Licensee-created End Product in which the Licensed Assets are a component part rather than the primary commercial offering. "End Product" means a game, application, website, design, video, or other creative work in which the Licensed Assets contribute to but do not constitute the primary deliverable.',
  ARRAY['digital_asset_license'],
  ARRAY['US','UK'],
  ARRAY['itchio','gumroad','opensea'],
  ARRAY['asset-license','redistribution','resale','prohibition'],
  'Asset flipping — repackaging purchased assets into new packs for sale — is the most common license violation on itch.io and Gumroad. Without this clause the restriction may not be enforceable.',
  true, true, false, '1.0.0', 'community', 35
),

-- ── 2. Missing collaboration clause ──────────────────────────────────
(
  'collab-exit-ip-reversion',
  'IP Reversion on Contributor Exit',
  'collaboration',
  'If you leave the project before we finish, the parts of the game you created stay with the project — you can put them in your portfolio but you cannot take them back or block us from using them.',
  'Upon a Contributor''s voluntary withdrawal or removal for cause from the Project, and subject to payment of any accrued compensation owed to the departing Contributor: (a) all Contributions made to the Project prior to the effective date of departure shall remain subject to the IP assignment in Section [IP], and the Lead Developer retains a perpetual, irrevocable, royalty-free licence to use, modify, and distribute those Contributions as part of the Project; (b) the departing Contributor retains the right to display the Contributions as portfolio work, provided no revenue is derived from standalone exploitation; (c) the departing Contributor shall have no right to enjoin, delay, or condition the Project''s continued development or commercial release.',
  ARRAY['collaborator_split'],
  ARRAY['US','UK'],
  ARRAY['itchio','gumroad'],
  ARRAY['collaboration','ip','exit','departure','reversion'],
  'Without this clause, a departing contributor may retain blocking rights over IP they created. Courts have enjoined game releases pending IP ownership disputes between former collaborators.',
  true, true, false, '1.0.0', 'community', 36
);

-- ── 3. Backfill jurisdiction_codes on all rows missing it ─────────────
-- Commission clauses — US+UK unless already set
UPDATE public.clauses SET jurisdiction_codes = ARRAY['US','UK']
WHERE category = 'commission' AND (jurisdiction_codes IS NULL OR jurisdiction_codes = '{}');

UPDATE public.clauses SET jurisdiction_codes = ARRAY['US','UK']
WHERE category = 'asset_license' AND (jurisdiction_codes IS NULL OR jurisdiction_codes = '{}');

UPDATE public.clauses SET jurisdiction_codes = ARRAY['US','UK']
WHERE category = 'collaboration' AND (jurisdiction_codes IS NULL OR jurisdiction_codes = '{}');

UPDATE public.clauses SET jurisdiction_codes = ARRAY['US','UK']
WHERE category = 'general' AND (jurisdiction_codes IS NULL OR jurisdiction_codes = '{}');

UPDATE public.clauses SET jurisdiction_codes = ARRAY['US','UK']
WHERE category = 'nft' AND (jurisdiction_codes IS NULL OR jurisdiction_codes = '{}');

-- ── 4. Backfill risk_notes on remaining rows ──────────────────────────
UPDATE public.clauses SET
  risk_notes = 'This clause protects both parties by clearly defining the terms of the agreement. Missing or vague terms in this area are a common source of commission disputes.'
WHERE (risk_notes IS NULL OR risk_notes = '') AND is_active = true;
