-- Migration: 003_extended_schema.sql
-- Adds the remaining required tables:
-- jurisdictions, platforms, wizard_questions, generated_contracts, exports,
-- license_pages, entitlements, audit_logs, clauses
-- Applied to Supabase project: yxkeyftjkblrikxserbs

-- =========================================================
-- JURISDICTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.jurisdictions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT        NOT NULL UNIQUE,  -- 'US-CA', 'UK', 'EU-DE', etc.
  country_code  TEXT        NOT NULL,          -- ISO 3166-1 alpha-2: 'US', 'GB', 'DE'
  name          TEXT        NOT NULL,          -- 'United States — California'
  region        TEXT,                          -- 'California', 'England and Wales'
  is_supported  BOOLEAN     NOT NULL DEFAULT FALSE,
  notes         TEXT,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.jurisdictions (code, country_code, name, region, is_supported, sort_order) VALUES
  ('US-CA', 'US', 'United States — California',         'California',        TRUE,  1),
  ('US-NY', 'US', 'United States — New York',           'New York',          TRUE,  2),
  ('US-TX', 'US', 'United States — Texas',              'Texas',             TRUE,  3),
  ('US-FL', 'US', 'United States — Florida',            'Florida',           TRUE,  4),
  ('US-WA', 'US', 'United States — Washington',         'Washington',        TRUE,  5),
  ('US-GA', 'US', 'United States — Georgia',            'Georgia',           TRUE,  6),
  ('UK',    'GB', 'United Kingdom (England and Wales)', 'England and Wales', TRUE,  10),
  ('EU-DE', 'DE', 'Germany',                            NULL,                FALSE, 20),
  ('EU-FR', 'FR', 'France',                             NULL,                FALSE, 21),
  ('CA',    'CA', 'Canada',                             NULL,                FALSE, 30),
  ('AU',    'AU', 'Australia',                          NULL,                FALSE, 31)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- PLATFORMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.platforms (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  url              TEXT,
  platform_type    TEXT        NOT NULL DEFAULT 'marketplace',
  -- 'marketplace' | 'payment_processor' | 'nft_marketplace' | 'self_hosted'
  is_supported     BOOLEAN     NOT NULL DEFAULT FALSE,
  refund_policy    TEXT,       -- short description of platform refund terms
  license_notes    TEXT,       -- platform-specific licensing gotchas
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.platforms (slug, name, url, platform_type, is_supported, refund_policy, license_notes, sort_order) VALUES
  ('gumroad',   'Gumroad',   'https://gumroad.com',   'payment_processor', TRUE,  '30-day refund window',                      'Gumroad is an intermediary; it does not define asset license terms on behalf of sellers.',      1),
  ('itchio',    'Itch.io',   'https://itch.io',       'marketplace',       TRUE,  'Creator-defined refund policy',              'License terms must be defined by the creator; itch.io takes no responsibility for license terms.',2),
  ('opensea',   'OpenSea',   'https://opensea.io',    'nft_marketplace',   TRUE,  'No standard refund policy for NFT sales',    'Platform removed optional creator royalties in 2023; contractual royalty obligation may differ.', 3),
  ('direct',    'Direct',    NULL,                    'self_hosted',       TRUE,  'Creator-defined',                            'No marketplace intermediary clauses needed.',                                                    4),
  ('etsy',      'Etsy',      'https://etsy.com',      'marketplace',       FALSE, 'Etsy Buyer Protection applies',              'Complex handmade/POD rules; deferred to v1.1.',                                                 10),
  ('steam',     'Steam',     'https://store.steampowered.com', 'marketplace', FALSE, 'Steam Subscriber Agreement applies',     'Publisher agreements needed; deferred to v1.1.',                                                11),
  ('patreon',   'Patreon',   'https://patreon.com',   'payment_processor', FALSE, 'Membership model; no standard refund',      'Subscription vs license hybrid; deferred to v1.1.',                                             12)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================
-- CLAUSES
-- Individual lawyer-vetted clause building blocks
-- =========================================================
CREATE TABLE IF NOT EXISTS public.clauses (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             TEXT        NOT NULL UNIQUE,
  title            TEXT        NOT NULL,
  category         TEXT        NOT NULL,
  -- 'commission' | 'asset_license' | 'collaboration' | 'nft' | 'general'
  plain_english    TEXT        NOT NULL,
  legal_text       TEXT        NOT NULL,
  variables        TEXT[]      NOT NULL DEFAULT '{}',
  -- list of {{variable_name}} placeholders in legal_text
  applies_to       TEXT[]      NOT NULL DEFAULT '{}',
  -- document_types this clause applies to
  jurisdiction_codes TEXT[]    NOT NULL DEFAULT '{}',
  -- empty = all jurisdictions
  is_required      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  lawyer_reviewed  BOOLEAN     NOT NULL DEFAULT FALSE,
  version          TEXT        NOT NULL DEFAULT '1.0',
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 30+ clauses
INSERT INTO public.clauses (slug, title, category, plain_english, legal_text, variables, applies_to, jurisdiction_codes, is_required, sort_order) VALUES

-- === COMMISSION CLAUSES (13) ===
('commission-scope',
 'Scope of Work',
 'commission',
 'Describes exactly what will be created — the specific artwork, format, and any limitations on what is included.',
 'The Artist agrees to create the following deliverable(s) as specified by the Client ("the Work"): {{deliverable_description}}. The Work shall be delivered in the following format(s): {{file_formats}}. This commission does not include any deliverables not explicitly stated above.',
 ARRAY['deliverable_description','file_formats'],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], TRUE, 10),

('commission-revisions',
 'Revision Policy',
 'commission',
 'Sets a clear limit on how many times the client can ask for changes. Going over the limit costs extra.',
 'The commission price includes {{revision_count}} round(s) of revisions. A "revision" is a single set of requested changes submitted at one time. Each additional round beyond the included amount will be charged at {{overage_fee}} per round. Revision requests must be submitted within {{revision_window}} days of receiving each deliverable.',
 ARRAY['revision_count','overage_fee','revision_window'],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], TRUE, 20),

('commission-payment',
 'Payment Terms',
 'commission',
 'How and when payment works. A deposit is required upfront; the rest is due before you get the final files.',
 'The total commission price is {{total_price}} {{currency}}. A non-refundable deposit of {{deposit_percentage}}% is required before work begins. The remaining balance is due {{payment_due_trigger}}. Final files will not be delivered until full payment is received.',
 ARRAY['total_price','currency','deposit_percentage','payment_due_trigger'],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], TRUE, 30),

('commission-ip-personal',
 'IP Rights — Personal Use Only',
 'commission',
 'The buyer can display and enjoy the artwork personally but cannot use it to make money or sell it.',
 'Upon receipt of full payment, the Client is granted a non-exclusive, non-transferable license to use the Work for personal, non-commercial purposes only. The Artist retains all copyright in the Work. The Client may not use the Work in any commercial context without the Artist''s express written permission.',
 ARRAY[]::TEXT[],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], FALSE, 40),

('commission-ip-commercial',
 'IP Rights — Commercial License',
 'commission',
 'The buyer can use the artwork in a business context (merch, ads, social media). The artist still owns the copyright.',
 'Upon receipt of full payment, the Client is granted a non-exclusive, worldwide, perpetual license to use the Work in commercial contexts including merchandise, advertising, and social media branding. The Artist retains all copyright. The Client may not resell or sublicense this license without written consent.',
 ARRAY[]::TEXT[],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], FALSE, 41),

('commission-ip-exclusive',
 'IP Rights — Exclusive Commercial License',
 'commission',
 'The buyer gets commercial use rights AND the artist agrees not to sell or reuse this design for anyone else.',
 'Upon receipt of full payment, the Client is granted an exclusive, worldwide, perpetual license to use the Work in commercial contexts. The Artist agrees not to reproduce, modify, or license this specific Work to any third party after delivery. The Artist retains copyright ownership.',
 ARRAY[]::TEXT[],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], FALSE, 42),

('commission-ip-transfer',
 'IP Rights — Full Copyright Transfer',
 'commission',
 'The artist transfers all rights to the buyer. The buyer owns the work completely.',
 'Upon receipt of full payment, the Artist hereby assigns and transfers to the Client all rights, title, and interest in and to the Work, including all copyright and intellectual property rights worldwide. This assignment is irrevocable. The Artist waives any moral rights to the extent permitted by applicable law.',
 ARRAY[]::TEXT[],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], FALSE, 43),

('commission-refund',
 'Refund Policy',
 'commission',
 'What happens if the commission is cancelled. The deposit is generally not refundable.',
 'The initial deposit is non-refundable under all circumstances. If the Client cancels after the sketch/draft stage, no refund will be issued for work completed to that point. If the Artist is unable to complete the commission, a full refund will be issued within 14 days.',
 ARRAY[]::TEXT[],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], TRUE, 50),

('commission-delivery',
 'Delivery Terms',
 'commission',
 'How and when the final work is delivered.',
 'The Artist will deliver the completed Work via {{delivery_method}} within {{delivery_timeframe}} of receiving final payment. High-resolution files will be delivered only upon receipt of full payment.',
 ARRAY['delivery_method','delivery_timeframe'],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], TRUE, 60),

('commission-portfolio',
 'Portfolio Rights',
 'commission',
 'The artist is allowed to show this work in their portfolio unless you ask them not to.',
 'The Artist reserves the right to display the Work in their portfolio and social media for promotional purposes, unless the Client has purchased an exclusive license and requests confidentiality in writing prior to delivery.',
 ARRAY[]::TEXT[],
 ARRAY['commission_agreement'],
 ARRAY[]::TEXT[], FALSE, 70),

('commission-governing-law-us',
 'Governing Law (United States)',
 'commission',
 'Which state''s laws apply if there''s a dispute.',
 'This Agreement shall be governed by and construed in accordance with the laws of the State of {{us_state}}, without regard to its conflict of law provisions. Disputes shall be subject to the exclusive jurisdiction of the courts of {{us_state}}.',
 ARRAY['us_state'],
 ARRAY['commission_agreement'],
 ARRAY['US-CA','US-NY','US-TX','US-FL','US-WA','US-GA'], TRUE, 90),

('commission-governing-law-uk',
 'Governing Law (United Kingdom)',
 'commission',
 'English and Welsh law applies.',
 'This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.',
 ARRAY[]::TEXT[],
 ARRAY['commission_agreement'],
 ARRAY['UK'], TRUE, 91),

('commission-disclaimer',
 'Legal Disclaimer',
 'general',
 'This contract was generated from a template and is not a substitute for legal advice.',
 'This agreement was generated using LicenseComposer templates. It is provided for general informational purposes only and does not constitute legal advice. LicenseComposer is not a law firm. The parties are advised to consult qualified legal counsel for jurisdiction-specific guidance.',
 ARRAY[]::TEXT[],
 ARRAY['commission_agreement','digital_asset_license','collaborator_split','nft_license'],
 ARRAY[]::TEXT[], TRUE, 999),

-- === ASSET LICENSE CLAUSES (11) ===
('asset-definition',
 'Asset Definition',
 'asset_license',
 'Describes exactly what digital files are being licensed.',
 'This License covers the following digital asset(s) ("the Asset"): {{asset_name}}, consisting of {{asset_description}} in the format(s) {{file_formats}}. The Asset is identified by LicenseComposer document ID: {{license_id}}.',
 ARRAY['asset_name','asset_description','file_formats','license_id'],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], TRUE, 10),

('asset-personal-use',
 'Personal Use License Tier',
 'asset_license',
 'You can use the asset in non-commercial, personal projects only.',
 'Personal Use License: The licensee is granted a non-exclusive, non-transferable right to use the Asset in personal, non-monetized projects only. Commercial use, including use in products for sale, advertising, or revenue-generating applications, is expressly prohibited under this tier.',
 ARRAY[]::TEXT[],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], FALSE, 20),

('asset-small-commercial',
 'Small Commercial License Tier',
 'asset_license',
 'You can use the asset in projects that earn up to $10,000 per year.',
 'Small Commercial License: The licensee is granted a non-exclusive right to use the Asset in commercial projects earning up to USD $10,000 gross annual revenue. Use in projects earning above this threshold requires the Unlimited Commercial License. This license covers one (1) end-product.',
 ARRAY[]::TEXT[],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], FALSE, 21),

('asset-unlimited-commercial',
 'Unlimited Commercial License Tier',
 'asset_license',
 'You can use the asset in any commercial project with no revenue cap.',
 'Unlimited Commercial License: The licensee is granted a non-exclusive, worldwide right to use the Asset in unlimited commercial projects with no revenue cap. This license covers unlimited end-products created by the licensee. The licensee may not redistribute or resell the Asset files themselves.',
 ARRAY[]::TEXT[],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], FALSE, 22),

('asset-no-redistribution',
 'No Redistribution',
 'asset_license',
 'You can''t share or resell the asset files themselves.',
 'The licensee may not redistribute, resell, share, or sublicense the Asset files, source files, or any component thereof, whether modified or unmodified. The Asset may only be incorporated within the licensee''s own end-products.',
 ARRAY[]::TEXT[],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], TRUE, 30),

('asset-attribution',
 'Attribution Required',
 'asset_license',
 'You need to credit the creator when you use this asset.',
 'Attribution is required under this license. The licensee must credit the creator as: "{{attribution_format}}" in the end-product''s credits, README, or documentation. Attribution must remain visible and not be obscured.',
 ARRAY['attribution_format'],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], FALSE, 40),

('asset-copyright-retention',
 'Copyright Retention',
 'asset_license',
 'The creator keeps the copyright. You''re getting a license to use it, not ownership.',
 'All copyright and intellectual property rights in the Asset remain with the creator, {{creator_name}}. This license grants usage rights only and does not constitute a transfer of copyright or any other intellectual property rights.',
 ARRAY['creator_name'],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], TRUE, 50),

('asset-itchio-platform',
 'Itch.io Platform Clause',
 'asset_license',
 'Clarifies how this license works for assets purchased on Itch.io.',
 'This asset was purchased through the Itch.io marketplace. Itch.io, Inc. is a marketplace intermediary and is not a party to this license agreement. License terms are set solely by the creator. The licensee''s Itch.io receipt serves as proof of license acquisition.',
 ARRAY[]::TEXT[],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], FALSE, 60),

('asset-gumroad-platform',
 'Gumroad Platform Clause',
 'asset_license',
 'Clarifies how this license works for assets purchased on Gumroad.',
 'This asset was purchased through the Gumroad platform. Gumroad, Inc. is a payment processor and marketplace intermediary and is not a party to this license agreement. Gumroad''s 30-day refund policy does not void this license if the licensee has downloaded and used the Asset.',
 ARRAY[]::TEXT[],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], FALSE, 61),

('asset-warranty-disclaimer',
 'Warranty Disclaimer',
 'asset_license',
 'The asset is provided as-is. No guarantees about fitness for a specific purpose.',
 'THE ASSET IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. THE CREATOR DISCLAIMS ALL WARRANTIES INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.',
 ARRAY[]::TEXT[],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], TRUE, 80),

('asset-ai-disclosure',
 'AI Generation Disclosure',
 'asset_license',
 'States whether AI tools were used to create this asset.',
 'AI Generation Disclosure: This asset was created {{ai_disclosure_text}}. The creator makes no warranty regarding copyright registration eligibility for AI-assisted works.',
 ARRAY['ai_disclosure_text'],
 ARRAY['digital_asset_license'],
 ARRAY[]::TEXT[], FALSE, 90),

-- === COLLABORATION CLAUSES (7) ===
('collab-parties',
 'Parties and Roles',
 'collaboration',
 'Who is involved in this project and what each person is responsible for.',
 'This Revenue Sharing Agreement ("Agreement") is entered into by the following contributors ("the Team"): {{contributor_list}}. Each contributor''s role and responsibilities are: {{role_descriptions}}.',
 ARRAY['contributor_list','role_descriptions'],
 ARRAY['collaborator_split'],
 ARRAY[]::TEXT[], TRUE, 10),

('collab-revenue-split',
 'Revenue Split',
 'collaboration',
 'How money is divided between contributors.',
 'Revenue from the Project shall be distributed as follows: {{revenue_split_table}}. Revenue is defined as {{revenue_definition}}. Platform fees, payment processing fees, and agreed operating expenses shall be deducted before the split is applied. Distributions shall occur {{payout_cadence}}.',
 ARRAY['revenue_split_table','revenue_definition','payout_cadence'],
 ARRAY['collaborator_split'],
 ARRAY[]::TEXT[], TRUE, 20),

('collab-ip-ownership',
 'IP Ownership',
 'collaboration',
 'Who owns the intellectual property of what gets created.',
 'All intellectual property created for the Project shall be {{ip_ownership_structure}}. Each contributor hereby assigns their contributions to the designated IP holder(s). No contributor may use the Project''s IP for competing purposes without written consent from all other contributors.',
 ARRAY['ip_ownership_structure'],
 ARRAY['collaborator_split'],
 ARRAY[]::TEXT[], TRUE, 30),

('collab-vesting',
 'Vesting Schedule',
 'collaboration',
 'Revenue share is earned over time or at milestones, not all at once when the agreement is signed.',
 'Revenue share vests according to the following schedule: {{vesting_schedule}}. A contributor who departs before completing their vested milestones shall receive only their vested share. The unvested portion shall be redistributed among remaining contributors pro-rata.',
 ARRAY['vesting_schedule'],
 ARRAY['collaborator_split'],
 ARRAY[]::TEXT[], FALSE, 40),

('collab-exit-terms',
 'Exit and Departure',
 'collaboration',
 'What happens if someone leaves the project.',
 'If a contributor departs the project voluntarily or is removed for cause, their ongoing revenue share shall {{exit_revenue_terms}}. The departing contributor {{exit_ip_terms}} to use their individual contributions in unrelated projects.',
 ARRAY['exit_revenue_terms','exit_ip_terms'],
 ARRAY['collaborator_split'],
 ARRAY[]::TEXT[], FALSE, 50),

('collab-dispute-resolution',
 'Dispute Resolution',
 'collaboration',
 'How disagreements between collaborators are resolved.',
 'In the event of a dispute, the parties shall first attempt resolution through good-faith negotiation for 30 days. If unresolved, the parties agree to non-binding mediation before pursuing litigation. The prevailing party in any litigation shall recover reasonable legal fees.',
 ARRAY[]::TEXT[],
 ARRAY['collaborator_split'],
 ARRAY[]::TEXT[], FALSE, 60),

('collab-revenue-reporting',
 'Revenue Reporting',
 'collaboration',
 'The person who receives the money must report it to the other contributors.',
 'The contributor responsible for receiving project revenue shall provide all other contributors with a monthly revenue statement within 10 business days of month-end, including platform revenue, deductions, and distribution calculations.',
 ARRAY[]::TEXT[],
 ARRAY['collaborator_split'],
 ARRAY[]::TEXT[], FALSE, 70),

-- === NFT CLAUSES (3) ===
('nft-token-vs-copyright',
 'Token Ownership vs. Copyright',
 'nft',
 'Buying the NFT token does not mean you own the copyright to the artwork.',
 'IMPORTANT: Ownership of the NFT token associated with this artwork does not constitute ownership of the underlying artwork''s copyright. The Creator retains all copyright in the underlying artwork ("the Art") unless explicitly transferred. Token ownership grants only the rights expressly stated in this license.',
 ARRAY[]::TEXT[],
 ARRAY['nft_license'],
 ARRAY[]::TEXT[], TRUE, 10),

('nft-buyer-rights',
 'NFT Buyer Rights',
 'nft',
 'What you can do with the artwork when you own the NFT.',
 'The current holder of the NFT is granted a non-exclusive license to: (1) display the Art for personal, non-commercial purposes; (2) resell the NFT token, at which point this license automatically transfers to the new holder. Commercial use requires a separate Commercial License.',
 ARRAY[]::TEXT[],
 ARRAY['nft_license'],
 ARRAY[]::TEXT[], TRUE, 20),

('nft-royalty-expectation',
 'Royalty Expectation',
 'nft',
 'States what royalties the creator expects on secondary sales, even if the platform doesn''t enforce them.',
 'The Creator expects a {{royalty_percentage}}% creator royalty on all secondary sales of this NFT. While some platforms may not technically enforce royalties, the buyer agrees in good faith to honor this royalty expectation as a contractual obligation.',
 ARRAY['royalty_percentage'],
 ARRAY['nft_license'],
 ARRAY[]::TEXT[], FALSE, 30)

ON CONFLICT (slug) DO NOTHING;

-- =========================================================
-- WIZARD_QUESTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.wizard_questions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wizard_schema_id UUID       REFERENCES public.wizard_schemas(id) ON DELETE CASCADE,
  template_id     UUID        REFERENCES public.templates(id) ON DELETE CASCADE,
  question_number INTEGER     NOT NULL,
  field_name      TEXT        NOT NULL,
  question_text   TEXT        NOT NULL,
  help_text       TEXT,
  question_type   TEXT        NOT NULL DEFAULT 'select',
  -- 'select' | 'text' | 'textarea' | 'number' | 'group' | 'toggle'
  options         JSONB,      -- for select type
  subfields       JSONB,      -- for group type
  is_required     BOOLEAN     NOT NULL DEFAULT TRUE,
  is_optional     BOOLEAN     NOT NULL DEFAULT FALSE,
  clause_ids      UUID[],     -- clauses this question affects
  clause_variant_map JSONB,   -- maps option value -> clause_id
  pain_quote_id   TEXT,       -- reference to evidence.json quote (e.g. 'Q003')
  pain_quote_text TEXT,       -- the actual pain quote
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- GENERATED_CONTRACTS
-- (alias/extension of generated_licenses with stricter typing)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.generated_contracts (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id          UUID        REFERENCES public.generated_licenses(id) ON DELETE SET NULL,
  user_id             UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  template_id         UUID        REFERENCES public.templates(id),
  template_version_id UUID        REFERENCES public.template_versions(id),
  document_type       TEXT        NOT NULL,
  -- 'commission_agreement' | 'digital_asset_license' | 'collaborator_split' | 'nft_license'
  jurisdiction_id     UUID        REFERENCES public.jurisdictions(id),
  platform_id         UUID        REFERENCES public.platforms(id),
  wizard_answers      JSONB       NOT NULL DEFAULT '{}',
  clause_ids_used     UUID[]      NOT NULL DEFAULT '{}',
  filled_legal_text   TEXT        NOT NULL,
  filled_plain_text   TEXT        NOT NULL,
  variables_resolved  JSONB       NOT NULL DEFAULT '{}',
  -- snapshot of all {{variable}} values used
  document_id         TEXT        NOT NULL UNIQUE,
  -- human-readable: LC-2026-XXXX
  document_hash       TEXT,
  template_hash       TEXT,
  provenance_chain    JSONB       NOT NULL DEFAULT '[]',
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  version_number      INTEGER     NOT NULL DEFAULT 1,
  creator_name        TEXT,
  product_name        TEXT,
  counterparty_name   TEXT,
  counterparty_email  TEXT,
  accepted_at         TIMESTAMPTZ,
  acceptance_token    TEXT,
  -- signed URL token for counterparty acceptance
  view_count          INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- EXPORTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.exports (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  contract_id     UUID        REFERENCES public.generated_contracts(id) ON DELETE CASCADE,
  license_id      UUID        REFERENCES public.generated_licenses(id) ON DELETE CASCADE,
  export_format   TEXT        NOT NULL DEFAULT 'pdf',
  -- 'pdf' | 'markdown' | 'docx' | 'txt'
  file_url        TEXT,
  file_size_bytes INTEGER,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  download_count  INTEGER     NOT NULL DEFAULT 0,
  metadata        JSONB       NOT NULL DEFAULT '{}'
);

-- =========================================================
-- LICENSE_PAGES
-- (public-facing page for a generated contract / license pack)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.license_pages (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'base64url'),
  user_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  contract_id     UUID        REFERENCES public.generated_contracts(id),
  license_id      UUID        REFERENCES public.generated_licenses(id),
  title           TEXT        NOT NULL,
  description     TEXT,
  product_url     TEXT,
  platform_slug   TEXT,
  is_public       BOOLEAN     NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  badge_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
  checkout_enabled BOOLEAN    NOT NULL DEFAULT FALSE,
  price_cents     INTEGER,
  currency        TEXT        NOT NULL DEFAULT 'usd',
  password_hash   TEXT,
  -- optional password protection
  view_count      INTEGER     NOT NULL DEFAULT 0,
  badge_embed_count INTEGER   NOT NULL DEFAULT 0,
  custom_css      TEXT,
  og_image_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- ENTITLEMENTS
-- (what a user is allowed to do based on plan/purchases)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.entitlements (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entitlement_type    TEXT        NOT NULL,
  -- 'unlimited_exports' | 'template_access' | 'badge_system' | 'version_history'
  -- | 'email_delivery' | 'lawyer_referral' | 'premium_template'
  source              TEXT        NOT NULL DEFAULT 'subscription',
  -- 'subscription' | 'purchase' | 'trial' | 'manual'
  template_id         UUID        REFERENCES public.templates(id),
  -- non-null for premium template unlocks
  subscription_id     UUID        REFERENCES public.subscriptions(id),
  purchase_id         UUID        REFERENCES public.purchases(id),
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  valid_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until         TIMESTAMPTZ,
  -- null = perpetual
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- AUDIT_LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type      TEXT        NOT NULL DEFAULT 'user',
  -- 'user' | 'system' | 'webhook' | 'admin'
  action          TEXT        NOT NULL,
  -- e.g. 'contract.created', 'export.downloaded', 'subscription.upgraded',
  --      'license.accepted', 'template.purchased', 'account.deleted'
  resource_type   TEXT,
  resource_id     UUID,
  resource_slug   TEXT,
  old_values      JSONB,
  new_values      JSONB,
  ip_hash         TEXT,
  user_agent_hash TEXT,
  session_id      TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log for contract creation trigger
CREATE OR REPLACE FUNCTION public.log_contract_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, resource_slug, new_values)
  VALUES (
    NEW.user_id,
    'contract.created',
    'generated_contracts',
    NEW.id,
    NEW.document_id,
    jsonb_build_object(
      'document_type', NEW.document_type,
      'template_id', NEW.template_id,
      'jurisdiction_id', NEW.jurisdiction_id,
      'platform_id', NEW.platform_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_contract_creation ON public.generated_contracts;
CREATE TRIGGER audit_contract_creation
  AFTER INSERT ON public.generated_contracts
  FOR EACH ROW EXECUTE PROCEDURE public.log_contract_creation();

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_clauses_category      ON public.clauses (category);
CREATE INDEX IF NOT EXISTS idx_clauses_applies_to    ON public.clauses USING gin (applies_to);
CREATE INDEX IF NOT EXISTS idx_wizard_questions_template ON public.wizard_questions (template_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_user ON public.generated_contracts (user_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_doc_id ON public.generated_contracts (document_id);
CREATE INDEX IF NOT EXISTS idx_exports_user         ON public.exports (user_id);
CREATE INDEX IF NOT EXISTS idx_license_pages_slug   ON public.license_pages (slug);
CREATE INDEX IF NOT EXISTS idx_license_pages_user   ON public.license_pages (user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_user    ON public.entitlements (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user      ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action    ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource  ON public.audit_logs (resource_type, resource_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.jurisdictions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clauses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wizard_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_pages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;

-- Public read: jurisdictions, platforms, clauses, wizard_questions
CREATE POLICY "jurisdictions_public_read"    ON public.jurisdictions    FOR SELECT USING (TRUE);
CREATE POLICY "platforms_public_read"        ON public.platforms        FOR SELECT USING (TRUE);
CREATE POLICY "clauses_public_read"          ON public.clauses          FOR SELECT USING (is_active = TRUE);
CREATE POLICY "wizard_questions_public_read" ON public.wizard_questions FOR SELECT USING (TRUE);

-- generated_contracts: owner all; public read if linked license is public
CREATE POLICY "contracts_owner_all"    ON public.generated_contracts FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "contracts_public_read"  ON public.generated_contracts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.generated_licenses gl
    WHERE gl.id = license_id AND gl.is_public = TRUE AND gl.is_active = TRUE
  ));

-- exports: owner only
CREATE POLICY "exports_owner_all" ON public.exports FOR ALL USING (auth.uid() = user_id);

-- license_pages: owner all; public read if is_public
CREATE POLICY "license_pages_owner_all"   ON public.license_pages FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "license_pages_public_read" ON public.license_pages FOR SELECT USING (is_public = TRUE AND is_active = TRUE);

-- entitlements: owner read only (system inserts)
CREATE POLICY "entitlements_owner_read" ON public.entitlements FOR SELECT USING (auth.uid() = user_id);

-- audit_logs: owner read own logs; no external write
CREATE POLICY "audit_logs_owner_read" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_logs_system_insert" ON public.audit_logs FOR INSERT WITH CHECK (TRUE);
