-- Migration: 006_clauses_spec_fields.sql
-- Adds missing spec-required columns to clauses:
--   risk_notes, vetting_status, platform_codes, tags
-- Backfills existing rows.
-- Adds 4 collaborator_split clauses to bring type to 12+ (was 8).

-- ────────────────────────────────────────────────────────────────────
-- 1.  Add columns
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.clauses
  ADD COLUMN IF NOT EXISTS risk_notes     TEXT,
  ADD COLUMN IF NOT EXISTS vetting_status TEXT NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS platform_codes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags           TEXT[] NOT NULL DEFAULT '{}';

-- Check constraint for vetting_status values
ALTER TABLE public.clauses
  DROP CONSTRAINT IF EXISTS clauses_vetting_status_check;
ALTER TABLE public.clauses
  ADD CONSTRAINT clauses_vetting_status_check
  CHECK (vetting_status IN ('community','under_review','lawyer_approved','deprecated'));

-- ────────────────────────────────────────────────────────────────────
-- 2.  Backfill existing rows: derive platform_codes from applies_to,
--     set sensible tags from category, set risk_notes where relevant
-- ────────────────────────────────────────────────────────────────────

-- All existing clauses get vetting_status='community' (already default)
-- platform_codes: map from applies_to document_types to platform slugs
UPDATE public.clauses SET
  platform_codes = ARRAY['itchio','gumroad'],
  tags = ARRAY['commission','scope','deliverables']
WHERE category = 'commission' AND tags = '{}';

UPDATE public.clauses SET
  platform_codes = ARRAY['itchio','gumroad','opensea'],
  tags = ARRAY['asset-license','usage','commercial']
WHERE category = 'asset_license' AND tags = '{}';

UPDATE public.clauses SET
  platform_codes = ARRAY['itchio','gumroad'],
  tags = ARRAY['collaboration','revenue-split','ip']
WHERE category = 'collaboration' AND tags = '{}';

UPDATE public.clauses SET
  platform_codes = ARRAY['opensea'],
  tags = ARRAY['nft','blockchain','ip','commercial']
WHERE category = 'nft' AND tags = '{}';

UPDATE public.clauses SET
  platform_codes = ARRAY['itchio','gumroad','opensea'],
  tags = ARRAY['general','jurisdiction','governing-law']
WHERE category = 'general' AND tags = '{}';

-- risk_notes: add for IP and payment-related clauses
UPDATE public.clauses SET
  risk_notes = 'Without this clause the creator retains copyright by default (Berne Convention). Buyers frequently assume commissioned work transfers all rights.'
WHERE slug LIKE '%ip%' OR slug LIKE '%copyright%' OR slug LIKE '%ownership%';

UPDATE public.clauses SET
  risk_notes = 'Scope creep is the #1 dispute in commission work. Ambiguous deliverables allow clients to request unlimited revisions at no extra cost.'
WHERE slug LIKE '%revision%' OR slug LIKE '%scope%' OR slug LIKE '%deliverable%';

UPDATE public.clauses SET
  risk_notes = 'Without a deposit clause, artists have no recourse if a client ghosts mid-project. Non-refundable deposits of 25-50% are industry standard.'
WHERE slug LIKE '%payment%' OR slug LIKE '%deposit%';

UPDATE public.clauses SET
  risk_notes = 'Revenue splits without written vesting schedules create walkaway risk: a contributor who leaves early can claim their full percentage.'
WHERE slug LIKE '%split%' OR slug LIKE '%revenue%' OR slug LIKE '%vesting%';

UPDATE public.clauses SET
  risk_notes = 'NFT purchase does not transfer copyright in most jurisdictions. Buyers routinely assume they own the underlying art without an explicit license grant.'
WHERE slug LIKE '%nft%' OR slug LIKE '%token%' OR category = 'nft';

-- ────────────────────────────────────────────────────────────────────
-- 3.  Add 4 collaborator_split clauses (brings type total to 12)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO public.clauses
  (slug, title, category, plain_english, legal_text,
   applies_to, jurisdiction_codes, platform_codes, tags,
   risk_notes, is_required, is_active, lawyer_reviewed, version,
   vetting_status, sort_order)
VALUES

-- C1: Gross vs Net Revenue Definition
(
  'collab-revenue-definition',
  'Revenue Definition — Gross vs Net',
  'collaboration',
  'We agree that "revenue" means the actual cash received by the platform after it takes its cut — not the list price. For example, if your game sells for $10 on Steam and Steam keeps 30%, each of us splits $7, not $10.',
  'For purposes of this Agreement, "Net Revenue" means gross receipts actually received by the lead developer from the applicable platform(s) after deduction of: (i) platform fees and commissions (e.g. Steam 30%, itch.io curator cut); (ii) applicable sales taxes and VAT collected and remitted by the platform; (iii) chargebacks and refunds. Revenue-share percentages stated herein apply to Net Revenue only.',
  ARRAY['collaborator_split'],
  ARRAY['US','UK'],
  ARRAY['itchio','gumroad'],
  ARRAY['collaboration','revenue-split','definitions'],
  'The most-contested term in every rev-share dispute. Ambiguity between "gross" and "net" can mean the difference of 30%+ per transaction.',
  true, true, false, '1.0.0', 'community', 31
),

-- C2: DLC and Sequel Revenue
(
  'collab-dlc-sequel-scope',
  'DLC, Sequel, and Merchandise Scope',
  'collaboration',
  'This agreement covers the original game/product only. Any sequels, DLC, or merchandise you sell separately are NOT included in the split — unless you write a new agreement with us.',
  'The revenue-sharing obligations set forth herein apply solely to the specific Work identified in Section 1 ("the Project"). Unless the parties execute a separate written addendum, revenue derived from: (a) sequels or substantially new works; (b) downloadable content (DLC) or expansion packs released as separate commercial products; (c) branded merchandise; or (d) licensing the Project IP to third parties, shall not be subject to the split percentages in this Agreement.',
  ARRAY['collaborator_split'],
  ARRAY['US','UK'],
  ARRAY['itchio','gumroad'],
  ARRAY['collaboration','revenue-split','scope','dlc'],
  'Without explicit DLC/sequel carve-out, a collaborator may claim their percentage applies to all derivative revenue. Industry disputes routinely arise over DLC released post-launch.',
  false, true, false, '1.0.0', 'community', 32
),

-- C3: Payout Cadence and Reporting
(
  'collab-payout-cadence',
  'Payout Schedule and Revenue Reporting',
  'collaboration',
  'The lead developer will send each collaborator their share within 30 days of each calendar quarter, along with a simple report showing how much the project earned and how the math works out.',
  'The Lead Developer shall, within thirty (30) days following the close of each calendar quarter, (a) deliver to each Collaborator a written revenue statement itemising gross receipts, deductions, Net Revenue, and each party''s calculated share; and (b) remit payment of each Collaborator''s earned share by the method agreed in Schedule A. Failure to remit within sixty (60) days of quarter close constitutes a material breach of this Agreement.',
  ARRAY['collaborator_split'],
  ARRAY['US','UK'],
  ARRAY['itchio','gumroad'],
  ARRAY['collaboration','payment','reporting','cadence'],
  'Indefinite "we will pay you eventually" arrangements are legally unenforceable. Specific cadence and cure period are required for a breach claim to be actionable.',
  true, true, false, '1.0.0', 'community', 33
),

-- C4: UK-Specific IP Assignment for Collaborations
(
  'collab-ip-assignment-uk',
  'IP Ownership Assignment (UK)',
  'collaboration',
  'Each of us transfers ownership of the parts we created to the project, so the whole game/product is owned jointly. Neither of us can sell or license the whole thing without the other''s written permission.',
  'Each Contributor hereby assigns to the Lead Developer (or, if specified in Schedule A, to a jointly-held entity) all present and future copyright and related rights (within the meaning of the Copyright, Designs and Patents Act 1988) in the Contribution, including the right to make adaptations, to grant sub-licences, and to exploit the Work in any medium or format now known or hereafter devised. This assignment is worldwide, royalty-free, and irrevocable save in the event of material breach by the Lead Developer. Moral rights are asserted but waived to the extent permitted by law.',
  ARRAY['collaborator_split'],
  ARRAY['UK'],
  ARRAY['itchio','gumroad'],
  ARRAY['collaboration','ip','copyright','uk','assignment'],
  'In the UK, the Copyright, Designs and Patents Act 1988 requires written assignment for copyright to transfer. Without this clause, each contributor retains independent copyright in their contribution and can block publication.',
  true, true, false, '1.0.0', 'community', 34
);

-- ────────────────────────────────────────────────────────────────────
-- 4.  Refresh content_hash for all clauses (trigger re-stamp)
-- ────────────────────────────────────────────────────────────────────
-- The stamp_clause_hash trigger fires on UPDATE to legal_text.
-- Touch every row so hashes include the new fields.
UPDATE public.clauses SET updated_at = now();
