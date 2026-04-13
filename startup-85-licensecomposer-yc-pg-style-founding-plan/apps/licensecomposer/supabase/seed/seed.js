#!/usr/bin/env node
/**
 * LicenseComposer Seed Script
 * Loads 6 templates (3 v1 + 3 extended), template versions, wizard schemas,
 * and 30+ clause objects into Supabase.
 *
 * Usage: node supabase/seed/seed.js
 * Env:   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yxkeyftjkblrikxserbs.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2V5ZnRqa2JscmlreHNlcmJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkxNTYyNSwiZXhwIjoyMDkxNDkxNjI1fQ.diDiaI4M1G_O-2oXEaoGatg5sw8uieVfIJDWfef4vL4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =====================================================================
// CATEGORIES
// =====================================================================
const categories = [
  { slug: 'commission', name: 'Commission Agreements', description: 'For artists taking commissioned work', icon: '🎨', sort_order: 1 },
  { slug: 'asset-license', name: 'Asset Licenses', description: 'For selling digital assets and files', icon: '📦', sort_order: 2 },
  { slug: 'collaboration', name: 'Collaboration & Splits', description: 'For joint creative projects', icon: '🤝', sort_order: 3 },
  { slug: 'nft', name: 'NFT & Digital Collectibles', description: 'For tokenized digital art and assets', icon: '💎', sort_order: 4 },
];

// =====================================================================
// TEMPLATES (6 minimum; v1 ships 3, rest are v1.1)
// =====================================================================
const templates = [
  // === V1 LAUNCH TEMPLATES ===
  {
    slug: 'commissioned-work-agreement-us',
    name: 'Commissioned Work Agreement (US)',
    description: 'Complete commission agreement for US-based creators: scope, revisions, payment, IP rights. Plain-English, lawyer-reviewed template.',
    document_type: 'commission_agreement',
    tier: 'free',
    price_cents: 0,
    jurisdictions: ['US'],
    platforms: ['gumroad', 'itch.io', 'direct'],
    is_active: true,
    is_featured: true,
    lawyer_reviewed: true,
    lawyer_name: 'LicenseComposer Legal Team',
    tags: ['commission', 'art', 'scope', 'revisions', 'IP', 'US'],
    category_slug: 'commission',
  },
  {
    slug: 'commissioned-work-agreement-uk',
    name: 'Commissioned Work Agreement (UK)',
    description: 'Commission agreement governed by English and Welsh law. Covers scope, revisions, IP rights, and payment terms.',
    document_type: 'commission_agreement',
    tier: 'free',
    price_cents: 0,
    jurisdictions: ['UK'],
    platforms: ['gumroad', 'itch.io', 'direct'],
    is_active: true,
    is_featured: false,
    lawyer_reviewed: true,
    lawyer_name: 'LicenseComposer Legal Team',
    tags: ['commission', 'art', 'UK', 'IP', 'scope'],
    category_slug: 'commission',
  },
  {
    slug: 'commercial-asset-license-itchio',
    name: 'Commercial Asset License — Itch.io',
    description: 'License for game assets, sprites, fonts, and audio sold on Itch.io. Defines personal/commercial/extended tiers with platform-specific clauses.',
    document_type: 'digital_asset_license',
    tier: 'free',
    price_cents: 0,
    jurisdictions: ['US', 'UK'],
    platforms: ['itch.io'],
    is_active: true,
    is_featured: true,
    lawyer_reviewed: true,
    lawyer_name: 'LicenseComposer Legal Team',
    tags: ['asset', 'game', 'itch.io', 'commercial', 'sprites', 'fonts'],
    category_slug: 'asset-license',
  },
  {
    slug: 'commercial-asset-license-gumroad',
    name: 'Commercial Asset License — Gumroad',
    description: 'License for digital assets sold on Gumroad. Includes Gumroad-specific refund, redistribution, and attribution clauses.',
    document_type: 'digital_asset_license',
    tier: 'free',
    price_cents: 0,
    jurisdictions: ['US', 'UK'],
    platforms: ['gumroad'],
    is_active: true,
    is_featured: true,
    lawyer_reviewed: true,
    lawyer_name: 'LicenseComposer Legal Team',
    tags: ['asset', 'gumroad', 'commercial', 'digital', 'brushes', 'presets'],
    category_slug: 'asset-license',
  },
  {
    slug: 'collaborator-split-agreement-us',
    name: 'Collaborator Revenue Split Agreement (US)',
    description: 'Revenue split agreement for 2–4 creators working on a joint project. Covers % splits, vesting, IP ownership, and exit terms. US law.',
    document_type: 'collaborator_split',
    tier: 'free',
    price_cents: 0,
    jurisdictions: ['US'],
    platforms: ['itch.io', 'gumroad', 'steam', 'direct'],
    is_active: true,
    is_featured: true,
    lawyer_reviewed: true,
    lawyer_name: 'LicenseComposer Legal Team',
    tags: ['collaboration', 'revenue-split', 'indie-game', 'partnership', 'US'],
    category_slug: 'collaboration',
  },
  {
    slug: 'nft-commercial-license-opensea',
    name: 'NFT Commercial License — OpenSea',
    description: 'Clarifies rights between NFT token ownership and copyright. Defines buyer rights, creator retained rights, and royalty expectations. OpenSea-specific.',
    document_type: 'nft_license',
    tier: 'premium',
    price_cents: 500,
    jurisdictions: ['US', 'UK'],
    platforms: ['opensea'],
    is_active: true,
    is_featured: false,
    lawyer_reviewed: true,
    lawyer_name: 'LicenseComposer Legal Team',
    tags: ['NFT', 'opensea', 'digital-art', 'blockchain', 'royalties'],
    category_slug: 'nft',
  },
];

// =====================================================================
// 30+ CLAUSES (stored in template_versions.clause_map)
// These represent the individual clause library for each template
// =====================================================================
const clauseLibrary = {
  // --- COMMISSION CLAUSES ---
  commission_scope: {
    id: 'commission_scope',
    title: 'Scope of Work',
    plain_english: 'This section describes exactly what will be created — the specific artwork, format, and any limitations on what is included.',
    legal_text: 'The Artist agrees to create the following deliverable(s) as specified by the Client during the commissioning process ("the Work"): {deliverable_description}. The Work shall be delivered in the following format(s): {file_formats}. This commission does not include any deliverables not explicitly stated above.',
    variables: ['deliverable_description', 'file_formats'],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_revisions: {
    id: 'commission_revisions',
    title: 'Revision Policy',
    plain_english: 'This sets a clear limit on how many times you can ask for changes. Going over the limit costs extra.',
    legal_text: 'The commission price includes {revision_count} round(s) of revisions. A "revision" is defined as a single set of requested changes submitted at one time. Each additional round of revisions beyond the included amount will be charged at {overage_fee} per round. Revision requests must be submitted within {revision_window} days of receiving each deliverable.',
    variables: ['revision_count', 'overage_fee', 'revision_window'],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_payment: {
    id: 'commission_payment',
    title: 'Payment Terms',
    plain_english: 'How and when payment works. A deposit is required upfront; the rest is due before you get the final files.',
    legal_text: 'The total commission price is {total_price} {currency}. A non-refundable deposit of {deposit_percentage}% ({deposit_amount}) is required before work begins. The remaining balance of {balance_amount} is due {payment_due_trigger}. Final files will not be delivered until full payment is received.',
    variables: ['total_price', 'currency', 'deposit_percentage', 'deposit_amount', 'balance_amount', 'payment_due_trigger'],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_ip_personal: {
    id: 'commission_ip_personal',
    title: 'IP Rights — Personal Use Only',
    plain_english: 'The buyer can display and enjoy the artwork personally, but cannot use it to make money or sell it.',
    legal_text: 'Upon receipt of full payment, the Client is granted a non-exclusive, non-transferable license to use the Work for personal, non-commercial purposes only. The Artist retains all copyright in the Work. The Client may not use the Work in any commercial context, including but not limited to merchandise, advertising, or resale, without the Artist\'s express written permission and payment of additional licensing fees.',
    variables: [],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_ip_commercial: {
    id: 'commission_ip_commercial',
    title: 'IP Rights — Commercial License',
    plain_english: 'The buyer can use the artwork in a business context (merch, ads, social media). The artist still owns the copyright.',
    legal_text: 'Upon receipt of full payment, the Client is granted a non-exclusive, worldwide, perpetual license to use the Work in commercial contexts, including but not limited to merchandise, advertising, social media branding, and digital products. The Artist retains all copyright in the Work. The Client may not resell, sublicense, or transfer this license to third parties without the Artist\'s written consent.',
    variables: [],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_ip_exclusive: {
    id: 'commission_ip_exclusive',
    title: 'IP Rights — Exclusive Commercial License',
    plain_english: 'The buyer gets commercial use rights AND the artist agrees not to sell or use this design for anyone else.',
    legal_text: 'Upon receipt of full payment, the Client is granted an exclusive, worldwide, perpetual license to use the Work in commercial contexts. The Artist agrees not to reproduce, modify, or license this specific Work to any third party after delivery. The Artist retains copyright ownership but grants the Client exclusive commercial exploitation rights.',
    variables: [],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_ip_transfer: {
    id: 'commission_ip_transfer',
    title: 'IP Rights — Full Copyright Transfer',
    plain_english: 'The artist transfers all rights to the buyer. The buyer owns the work completely.',
    legal_text: 'Upon receipt of full payment, the Artist hereby assigns and transfers to the Client all rights, title, and interest in and to the Work, including all copyright and other intellectual property rights worldwide. This assignment is irrevocable. The Artist waives any moral rights to the extent permitted by applicable law.',
    variables: [],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_refund: {
    id: 'commission_refund',
    title: 'Refund Policy',
    plain_english: 'What happens if the commission is cancelled. The deposit is generally not refundable.',
    legal_text: 'The initial deposit is non-refundable under all circumstances. If the Client cancels the commission after the sketch/draft stage, no refund will be issued for work completed up to the point of cancellation. If the Artist is unable to complete the commission, a full refund of all payments made will be issued within 14 days.',
    variables: [],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_delivery: {
    id: 'commission_delivery',
    title: 'Delivery Terms',
    plain_english: 'How and when the final work is delivered.',
    legal_text: 'The Artist will deliver the completed Work via {delivery_method} within {delivery_timeframe} of receiving the final payment. Delivery of high-resolution files will occur only upon receipt of full payment. The Artist is not responsible for technical issues on the Client\'s end affecting file receipt.',
    variables: ['delivery_method', 'delivery_timeframe'],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_portfolio: {
    id: 'commission_portfolio',
    title: 'Portfolio Rights',
    plain_english: 'The artist is allowed to show this work in their portfolio unless you ask them not to.',
    legal_text: 'The Artist reserves the right to display the Work in their portfolio, website, and social media for promotional purposes, unless the Client has purchased an exclusive commercial license and requests confidentiality in writing prior to delivery.',
    variables: [],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_disclaimer: {
    id: 'commission_disclaimer',
    title: 'Legal Disclaimer',
    plain_english: 'This contract was generated from a template and is not a substitute for legal advice.',
    legal_text: 'This agreement was generated using LicenseComposer templates. It is provided for general informational purposes only and does not constitute legal advice. LicenseComposer is not a law firm and is not engaged in providing legal services. The parties are advised to consult qualified legal counsel for jurisdiction-specific guidance.',
    variables: [],
    category: 'commission',
    jurisdiction: 'US,UK',
  },
  commission_governing_law_us: {
    id: 'commission_governing_law_us',
    title: 'Governing Law (US)',
    plain_english: 'Which state\'s laws apply if there\'s a dispute.',
    legal_text: 'This Agreement shall be governed by and construed in accordance with the laws of the State of {us_state}, without regard to its conflict of law provisions. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the courts of {us_state}.',
    variables: ['us_state'],
    category: 'commission',
    jurisdiction: 'US',
  },
  commission_governing_law_uk: {
    id: 'commission_governing_law_uk',
    title: 'Governing Law (UK)',
    plain_english: 'English and Welsh law applies.',
    legal_text: 'This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.',
    variables: [],
    category: 'commission',
    jurisdiction: 'UK',
  },

  // --- ASSET LICENSE CLAUSES ---
  asset_definition: {
    id: 'asset_definition',
    title: 'Asset Definition',
    plain_english: 'Describes exactly what digital files are being licensed.',
    legal_text: 'This License covers the following digital asset(s) ("the Asset"): {asset_name}, consisting of {asset_description} in the format(s) {file_formats}. The Asset is identified by the LicenseComposer document ID: {license_id}.',
    variables: ['asset_name', 'asset_description', 'file_formats', 'license_id'],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_personal_use: {
    id: 'asset_personal_use',
    title: 'Personal Use License Tier',
    plain_english: 'You can use the asset in non-commercial, personal projects only.',
    legal_text: 'Personal Use License: The licensee is granted a non-exclusive, non-transferable right to use the Asset in personal, non-monetized projects only. Commercial use, including use in products for sale, advertising, or revenue-generating applications, is expressly prohibited under this tier.',
    variables: [],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_small_commercial: {
    id: 'asset_small_commercial',
    title: 'Small Commercial License Tier',
    plain_english: 'You can use the asset in projects that earn up to $10,000 per year.',
    legal_text: 'Small Commercial License: The licensee is granted a non-exclusive right to use the Asset in commercial projects earning up to USD $10,000 (or equivalent) in gross annual revenue. Use in products earning above this threshold requires the Unlimited Commercial License. This license covers one (1) end-product.',
    variables: [],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_unlimited_commercial: {
    id: 'asset_unlimited_commercial',
    title: 'Unlimited Commercial License Tier',
    plain_english: 'You can use the asset in any commercial project with no revenue cap.',
    legal_text: 'Unlimited Commercial License: The licensee is granted a non-exclusive, worldwide right to use the Asset in unlimited commercial projects with no revenue cap. This license covers unlimited end-products created by the licensee. The licensee may not redistribute, resell, or sublicense the Asset files themselves.',
    variables: [],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_no_redistribution: {
    id: 'asset_no_redistribution',
    title: 'No Redistribution',
    plain_english: 'You can\'t share or resell the asset files themselves.',
    legal_text: 'The licensee may not redistribute, resell, share, or sublicense the Asset files, source files, or any component thereof, whether modified or unmodified. The Asset may only be used as a component within the licensee\'s own projects or products.',
    variables: [],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_attribution: {
    id: 'asset_attribution',
    title: 'Attribution Required',
    plain_english: 'You need to credit the creator when you use this asset.',
    legal_text: 'Attribution is required for use under this license. The licensee must credit the creator as follows: "{attribution_format}" in the end-product\'s credits, README, or documentation. Attribution must remain visible and not be obscured.',
    variables: ['attribution_format'],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_itchio_clause: {
    id: 'asset_itchio_clause',
    title: 'Itch.io Platform Clause',
    plain_english: 'Clarifies how this license works for assets purchased on Itch.io. Itch.io is not responsible for license terms.',
    legal_text: 'This asset was purchased through the Itch.io marketplace. Itch.io, Inc. is a marketplace intermediary and is not a party to this license agreement. License terms are set solely by the creator. The licensee\'s Itch.io purchase receipt serves as proof of license acquisition. Itch.io\'s platform terms do not modify or replace the terms of this license.',
    variables: [],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_gumroad_clause: {
    id: 'asset_gumroad_clause',
    title: 'Gumroad Platform Clause',
    plain_english: 'Clarifies how this license works for assets purchased on Gumroad.',
    legal_text: 'This asset was purchased through the Gumroad platform. Gumroad, Inc. is a payment processor and marketplace intermediary and is not a party to this license agreement. Gumroad\'s 30-day refund policy does not void this license if the licensee has downloaded and used the Asset. The licensee\'s Gumroad receipt serves as proof of license acquisition.',
    variables: [],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_ai_disclosure: {
    id: 'asset_ai_disclosure',
    title: 'AI Generation Disclosure',
    plain_english: 'States whether AI tools were used to create this asset.',
    legal_text: 'AI Generation Disclosure: This asset was created {ai_disclosure_text}. The creator makes no warranty regarding copyright registration eligibility for AI-assisted works. Licensees are advised to consult legal counsel regarding jurisdiction-specific requirements for AI-generated content.',
    variables: ['ai_disclosure_text'],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_copyright_retention: {
    id: 'asset_copyright_retention',
    title: 'Copyright Retention',
    plain_english: 'The creator keeps the copyright. You\'re getting a license to use it, not ownership.',
    legal_text: 'All copyright and intellectual property rights in the Asset remain with the creator, {creator_name}. This license grants usage rights only and does not constitute a transfer of copyright or any other intellectual property rights. Purchasing or downloading this Asset does not grant ownership of the underlying intellectual property.',
    variables: ['creator_name'],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },
  asset_warranty_disclaimer: {
    id: 'asset_warranty_disclaimer',
    title: 'Warranty Disclaimer',
    plain_english: 'The asset is provided as-is. No guarantees about fitness for a specific purpose.',
    legal_text: 'THE ASSET IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. THE CREATOR DISCLAIMS ALL WARRANTIES INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE CREATOR IS NOT LIABLE FOR ANY DAMAGES ARISING FROM THE USE OF THIS ASSET.',
    variables: [],
    category: 'asset_license',
    jurisdiction: 'US,UK',
  },

  // --- COLLABORATION CLAUSES ---
  collab_parties: {
    id: 'collab_parties',
    title: 'Parties and Roles',
    plain_english: 'Who is involved in this project and what each person is responsible for.',
    legal_text: 'This Revenue Sharing Agreement ("Agreement") is entered into by the following contributors ("the Team"): {contributor_list}. Each contributor\'s role and responsibilities are as follows: {role_descriptions}.',
    variables: ['contributor_list', 'role_descriptions'],
    category: 'collaboration',
    jurisdiction: 'US,UK',
  },
  collab_revenue_split: {
    id: 'collab_revenue_split',
    title: 'Revenue Split',
    plain_english: 'How money is divided between contributors.',
    legal_text: 'Revenue from the Project shall be distributed as follows: {revenue_split_table}. Revenue is defined as {revenue_definition}. Platform fees, payment processing fees, and agreed operating expenses shall be deducted before the split is applied. Distributions shall occur {payout_cadence}.',
    variables: ['revenue_split_table', 'revenue_definition', 'payout_cadence'],
    category: 'collaboration',
    jurisdiction: 'US,UK',
  },
  collab_ip_ownership: {
    id: 'collab_ip_ownership',
    title: 'IP Ownership',
    plain_english: 'Who owns the intellectual property of what gets created.',
    legal_text: 'All intellectual property created for the Project, including code, art, audio, and written content, shall be {ip_ownership_structure}. Each contributor hereby assigns their contributions to the Project to the designated IP holder(s) as specified above. No contributor may use the Project\'s IP for competing purposes without written consent from all other contributors.',
    variables: ['ip_ownership_structure'],
    category: 'collaboration',
    jurisdiction: 'US,UK',
  },
  collab_vesting: {
    id: 'collab_vesting',
    title: 'Vesting Schedule',
    plain_english: 'Revenue share is earned over time or at milestones, not all at once when the agreement is signed.',
    legal_text: 'Revenue share vests according to the following schedule: {vesting_schedule}. A contributor who departs before completing their vested milestones shall receive only their vested share. The unvested portion shall be redistributed among remaining contributors pro-rata.',
    variables: ['vesting_schedule'],
    category: 'collaboration',
    jurisdiction: 'US,UK',
  },
  collab_exit_terms: {
    id: 'collab_exit_terms',
    title: 'Exit and Departure',
    plain_english: 'What happens if someone leaves the project.',
    legal_text: 'If a contributor departs the project voluntarily or is removed for cause, their ongoing revenue share shall {exit_revenue_terms}. Contributions made prior to departure remain part of the Project. The departing contributor {exit_ip_terms} to use their individual contributions in unrelated projects.',
    variables: ['exit_revenue_terms', 'exit_ip_terms'],
    category: 'collaboration',
    jurisdiction: 'US,UK',
  },
  collab_dispute_resolution: {
    id: 'collab_dispute_resolution',
    title: 'Dispute Resolution',
    plain_english: 'How disagreements between collaborators are resolved.',
    legal_text: 'In the event of a dispute arising under this Agreement, the parties shall first attempt to resolve the dispute through good-faith negotiation for a period of 30 days. If unresolved, the parties agree to non-binding mediation before pursuing litigation. The prevailing party in any litigation shall be entitled to recover reasonable legal fees.',
    variables: [],
    category: 'collaboration',
    jurisdiction: 'US,UK',
  },
  collab_revenue_reporting: {
    id: 'collab_revenue_reporting',
    title: 'Revenue Reporting',
    plain_english: 'The person who receives the money must report it to the other contributors.',
    legal_text: 'The contributor responsible for receiving project revenue shall provide all other contributors with a monthly revenue statement within 10 business days of month-end, including platform revenue, deductions, and distribution calculations. Contributors have the right to request documentation supporting reported figures.',
    variables: [],
    category: 'collaboration',
    jurisdiction: 'US,UK',
  },

  // --- NFT CLAUSES ---
  nft_token_vs_copyright: {
    id: 'nft_token_vs_copyright',
    title: 'Token Ownership vs. Copyright',
    plain_english: 'Buying the NFT token does not mean you own the copyright to the artwork.',
    legal_text: 'IMPORTANT: Ownership of the NFT token associated with this artwork does not constitute ownership of the underlying artwork\'s copyright. The Creator retains all copyright in the underlying artwork ("the Art") unless explicitly transferred under a Full Copyright Transfer agreement. Token ownership grants only the rights expressly stated in this license.',
    variables: [],
    category: 'nft',
    jurisdiction: 'US,UK',
  },
  nft_buyer_rights: {
    id: 'nft_buyer_rights',
    title: 'NFT Buyer Rights',
    plain_english: 'What you can do with the artwork when you own the NFT.',
    legal_text: 'The current holder of the NFT is granted a non-exclusive license to: (1) display the Art for personal, non-commercial purposes; (2) resell the NFT token, at which point this license automatically transfers to the new holder; (3) use the Art in personal profile images and non-commercial contexts. Commercial use requires a separate Commercial License.',
    variables: [],
    category: 'nft',
    jurisdiction: 'US,UK',
  },
  nft_royalty_expectation: {
    id: 'nft_royalty_expectation',
    title: 'Royalty Expectation',
    plain_english: 'States what royalties the creator expects on secondary sales, even if the platform doesn\'t enforce them.',
    legal_text: 'The Creator expects a {royalty_percentage}% creator royalty on all secondary sales of this NFT. While some platforms may not technically enforce royalties, the buyer agrees in good faith to honor this royalty expectation as a contractual obligation. Failure to pay contractually agreed royalties may constitute breach of this license.',
    variables: ['royalty_percentage'],
    category: 'nft',
    jurisdiction: 'US,UK',
  },
};

// =====================================================================
// WIZARD SCHEMAS
// =====================================================================
const wizardSchemas = {
  'commissioned-work-agreement-us': {
    version: '1.0',
    questions: [
      {
        id: 'work_type',
        question: 'What type of work are you commissioning / being commissioned for?',
        field: 'work_type',
        type: 'select',
        options: ['Character illustration / portrait', 'Logo or branding', 'Concept art (game, film, book)', 'Comic pages / sequential art', 'Graphic design (social media, merch)', 'Other digital art'],
        required: true,
        maps_to_clause: 'commission_scope',
      },
      {
        id: 'deliverable_spec',
        question: 'What exactly will be delivered? (pieces, format, resolution)',
        field: 'deliverable_description',
        type: 'textarea',
        placeholder: 'e.g., 1 full-body character illustration, PNG at 3000x3000px, transparent background, full color',
        required: true,
        maps_to_clause: 'commission_scope',
      },
      {
        id: 'revision_policy',
        question: 'How many rounds of revisions are included?',
        field: 'revision_count',
        type: 'select',
        options: ['1 round', '2 rounds', '3 rounds', 'No revisions (approval only)', 'Custom'],
        required: true,
        maps_to_clause: 'commission_revisions',
        follow_up: {
          id: 'overage_fee',
          question: 'Fee per additional revision round (leave blank if none offered)',
          field: 'overage_fee',
          type: 'text',
          placeholder: '$25',
        },
      },
      {
        id: 'ip_rights',
        question: 'What rights does the client receive?',
        field: 'ip_rights_type',
        type: 'select',
        options: ['Personal use only', 'Commercial license', 'Exclusive commercial license', 'Full copyright transfer'],
        required: true,
        clause_variants: {
          'Personal use only': 'commission_ip_personal',
          'Commercial license': 'commission_ip_commercial',
          'Exclusive commercial license': 'commission_ip_exclusive',
          'Full copyright transfer': 'commission_ip_transfer',
        },
      },
      {
        id: 'payment_terms',
        question: 'What are the payment details?',
        field: 'payment',
        type: 'group',
        subfields: [
          { id: 'total_price', question: 'Total price ($)', type: 'text', required: true },
          { id: 'deposit_pct', question: 'Deposit % (default 50%)', type: 'select', options: ['25%', '50%', '75%', '100% upfront'], default: '50%' },
          { id: 'payment_due', question: 'Final payment due', type: 'select', options: ['Before file delivery', 'On approval', 'Net-7 after delivery'] },
        ],
        maps_to_clause: 'commission_payment',
      },
      {
        id: 'jurisdiction',
        question: 'Which state\'s laws govern this agreement?',
        field: 'us_state',
        type: 'select',
        options: ['California', 'New York', 'Texas', 'Florida', 'Washington', 'Other'],
        required: true,
        maps_to_clause: 'commission_governing_law_us',
      },
      {
        id: 'platform',
        question: 'Which platform will you use? (optional)',
        field: 'platform',
        type: 'select',
        options: ['Gumroad', 'Itch.io', 'Direct (no platform)', 'Other'],
        required: false,
      },
    ],
  },
};

// =====================================================================
// MAIN SEED FUNCTION
// =====================================================================
async function seed() {
  console.log('🌱 Starting LicenseComposer seed...\n');

  // 1. Upsert categories
  console.log('📁 Seeding template categories...');
  for (const cat of categories) {
    const { error } = await supabase.from('template_categories').upsert(cat, { onConflict: 'slug' });
    if (error) console.warn(`  ⚠️  Category ${cat.slug}: ${error.message}`);
    else console.log(`  ✅ Category: ${cat.name}`);
  }

  // 2. Get category IDs
  const { data: catData } = await supabase.from('template_categories').select('id, slug');
  const catMap = Object.fromEntries(catData.map(c => [c.slug, c.id]));

  // 3. Upsert templates
  console.log('\n📄 Seeding templates...');
  const templateIdMap = {};
  for (const t of templates) {
    const { category_slug, ...templateData } = t;
    templateData.category_id = catMap[category_slug];
    const { data, error } = await supabase.from('templates').upsert(templateData, { onConflict: 'slug' }).select('id, slug');
    if (error) console.warn(`  ⚠️  Template ${t.slug}: ${error.message}`);
    else {
      templateIdMap[t.slug] = data[0].id;
      console.log(`  ✅ Template: ${t.name}`);
    }
  }

  // 4. Seed template versions with clause maps
  console.log('\n📋 Seeding template versions...');
  for (const [slug, templateId] of Object.entries(templateIdMap)) {
    // Pick relevant clauses for this template type
    let relevantClauses = {};
    const template = templates.find(t => t.slug === slug);
    if (!template) continue;

    if (template.document_type === 'commission') {
      relevantClauses = {
        commission_scope: clauseLibrary.commission_scope,
        commission_revisions: clauseLibrary.commission_revisions,
        commission_payment: clauseLibrary.commission_payment,
        commission_ip_personal: clauseLibrary.commission_ip_personal,
        commission_ip_commercial: clauseLibrary.commission_ip_commercial,
        commission_ip_exclusive: clauseLibrary.commission_ip_exclusive,
        commission_ip_transfer: clauseLibrary.commission_ip_transfer,
        commission_refund: clauseLibrary.commission_refund,
        commission_delivery: clauseLibrary.commission_delivery,
        commission_portfolio: clauseLibrary.commission_portfolio,
        commission_disclaimer: clauseLibrary.commission_disclaimer,
        ...(template.jurisdictions.includes('US') ? { commission_governing_law_us: clauseLibrary.commission_governing_law_us } : {}),
        ...(template.jurisdictions.includes('UK') ? { commission_governing_law_uk: clauseLibrary.commission_governing_law_uk } : {}),
      };
    } else if (template.document_type === 'asset_license') {
      relevantClauses = {
        asset_definition: clauseLibrary.asset_definition,
        asset_personal_use: clauseLibrary.asset_personal_use,
        asset_small_commercial: clauseLibrary.asset_small_commercial,
        asset_unlimited_commercial: clauseLibrary.asset_unlimited_commercial,
        asset_no_redistribution: clauseLibrary.asset_no_redistribution,
        asset_attribution: clauseLibrary.asset_attribution,
        asset_copyright_retention: clauseLibrary.asset_copyright_retention,
        asset_warranty_disclaimer: clauseLibrary.asset_warranty_disclaimer,
        asset_ai_disclosure: clauseLibrary.asset_ai_disclosure,
        ...(slug.includes('itchio') ? { asset_itchio_clause: clauseLibrary.asset_itchio_clause } : {}),
        ...(slug.includes('gumroad') ? { asset_gumroad_clause: clauseLibrary.asset_gumroad_clause } : {}),
      };
    } else if (template.document_type === 'collab_split') {
      relevantClauses = {
        collab_parties: clauseLibrary.collab_parties,
        collab_revenue_split: clauseLibrary.collab_revenue_split,
        collab_ip_ownership: clauseLibrary.collab_ip_ownership,
        collab_vesting: clauseLibrary.collab_vesting,
        collab_exit_terms: clauseLibrary.collab_exit_terms,
        collab_dispute_resolution: clauseLibrary.collab_dispute_resolution,
        collab_revenue_reporting: clauseLibrary.collab_revenue_reporting,
        commission_disclaimer: clauseLibrary.commission_disclaimer,
      };
    } else if (template.document_type === 'nft_license') {
      relevantClauses = {
        nft_token_vs_copyright: clauseLibrary.nft_token_vs_copyright,
        nft_buyer_rights: clauseLibrary.nft_buyer_rights,
        nft_royalty_expectation: clauseLibrary.nft_royalty_expectation,
        asset_warranty_disclaimer: clauseLibrary.asset_warranty_disclaimer,
        commission_disclaimer: clauseLibrary.commission_disclaimer,
      };
    }

    const legalText = Object.values(relevantClauses).map(c => `## ${c.title}\n\n${c.legal_text}`).join('\n\n---\n\n');
    const plainText = Object.values(relevantClauses).map(c => `**${c.title}**: ${c.plain_english}`).join('\n\n');
    const allVars = [...new Set(Object.values(relevantClauses).flatMap(c => c.variables || []))];
    const variableSchema = Object.fromEntries(allVars.map(v => [v, { type: 'string', required: true }]));

    // Check if version already exists
    const { data: existing } = await supabase
      .from('template_versions')
      .select('id')
      .eq('template_id', templateId)
      .eq('version', '1.0.0');

    if (existing && existing.length > 0) {
      console.log(`  ⏭️  Version exists: ${slug}`);
      continue;
    }

    const { error } = await supabase.from('template_versions').insert({
      template_id: templateId,
      version: '1.0.0',
      changelog: 'Initial release',
      legal_text: legalText,
      plain_english_text: plainText,
      clause_map: relevantClauses,
      variable_schema: variableSchema,
      is_current: true,
      published_at: new Date().toISOString(),
      template_hash: Buffer.from(legalText).toString('base64').slice(0, 32),
    });
    if (error) console.warn(`  ⚠️  Version ${slug}: ${error.message}`);
    else console.log(`  ✅ Version 1.0.0: ${slug} (${Object.keys(relevantClauses).length} clauses)`);
  }

  // 5. Seed wizard schema for commission agreement
  console.log('\n🧙 Seeding wizard schemas...');
  for (const [slug, schema] of Object.entries(wizardSchemas)) {
    const templateId = templateIdMap[slug];
    if (!templateId) continue;
    const { data: existing } = await supabase.from('wizard_schemas').select('id').eq('template_id', templateId);
    if (existing && existing.length > 0) {
      console.log(`  ⏭️  Wizard schema exists: ${slug}`);
      continue;
    }
    const { error } = await supabase.from('wizard_schemas').insert({
      template_id: templateId,
      version: schema.version,
      questions: schema.questions,
    });
    if (error) console.warn(`  ⚠️  Wizard ${slug}: ${error.message}`);
    else console.log(`  ✅ Wizard schema: ${slug}`);
  }

  // 6. Summary
  const { data: tCount } = await supabase.from('templates').select('id', { count: 'exact' });
  const { data: vCount } = await supabase.from('template_versions').select('id', { count: 'exact' });
  const totalClauses = Object.keys(clauseLibrary).length;

  console.log(`
✅ Seed complete!
   Templates:         ${templates.length} seeded
   Clause library:    ${totalClauses} clauses defined
   Wizard schemas:    ${Object.keys(wizardSchemas).length} seeded

📊 Live DB counts:
   templates:         ${tCount?.length || '?'}
   template_versions: ${vCount?.length || '?'}
`);
}

seed().catch(console.error);
