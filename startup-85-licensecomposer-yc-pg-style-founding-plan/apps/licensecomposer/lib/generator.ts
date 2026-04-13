/**
 * lib/generator.ts
 * Core contract generator service.
 *
 * Responsibility chain:
 * 1. Resolve the current template_version for the requested template
 * 2. Build the active clause set from clause_map (respecting wizard toggles, locked, default)
 * 3. Augment with platform- and jurisdiction-specific clauses from the clauses table
 * 4. Resolve {{VARIABLE}} tokens in legal_text and plain_text
 * 5. Compute SHA-256 clause_hashes, template_hash, provenance_chain, changelog
 * 6. Return a fully-resolved GeneratorResult
 */

import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WizardAnswers } from './wizard-types';
import { DEFAULT_TEMPLATE } from './wizard-types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClauseEntry {
  key: string;
  label: string;
  legalText: string;
  plainText: string;
  source: 'template_version' | 'clauses_table' | 'injected';
  locked: boolean;
  hash: string;
}

export interface GeneratorResult {
  templateSlug:    string;
  templateName:    string;
  templateVersion: string;
  templateVersionId: string;
  legalText:       string;
  plainText:       string;
  clauses:         ClauseEntry[];
  clauseHashes:    Record<string, string>;
  templateHash:    string;
  provenanceHash:  string;
  provenanceChain: object;
  changelog:       string[];
  variablesResolved: Record<string, string>;
  generatedAt:     string;
  generatorVersion: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function sha256Short(text: string): string {
  return sha256(text).slice(0, 16);
}

/** Replace all {{TOKEN}} occurrences in text */
function resolveTokens(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{([A-Z_a-z0-9]+)\}\}/g, (_, key) => {
    // try exact, UPPER, lower
    return vars[key] ?? vars[key.toUpperCase()] ?? vars[key.toLowerCase()] ?? `[${key}]`;
  });
}

/** Build the variable map from wizard answers */
export function buildVariableMap(a: WizardAnswers): Record<string, string> {
  const currencySymbol = a.currency === 'GBP' ? '£' : a.currency === 'EUR' ? '€' : '$';
  const depositPct     = a.deposit_percent ?? 50;
  const totalFee       = a.total_fee ?? 0;
  const depositAmt     = totalFee ? ((totalFee * depositPct) / 100).toFixed(2) : '0.00';
  const today          = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const licenseId      = `PP-${Date.now().toString(36).toUpperCase()}`;

  const splitA = a.split_a_percent ?? 50;
  const splitB = a.split_b_percent ?? (100 - splitA);

  const m: Record<string, string> = {
    // Identity
    CREATOR_NAME:         a.creator_name        ?? '[Creator Name]',
    CLIENT_NAME:          a.client_name         ?? '[Client Name]',
    COLLABORATOR_A_NAME:  a.creator_name        ?? '[Party A]',
    COLLABORATOR_B_NAME:  a.party_b_name        ?? a.party_a_name ?? '[Party B]',
    // Product
    PRODUCT_NAME:         a.product_name        ?? '[Product Name]',
    PRODUCT_URL:          '',
    PROJECT_NAME:         a.product_name        ?? '[Project Name]',
    PROJECT_DESCRIPTION:  a.delivery_format     ?? '[Project description]',
    PROJECT_TYPE:         a.commission_type     ?? 'digital project',
    TARGET_PLATFORMS:     a.platform            ?? 'multiple platforms',
    // Commission
    COMMISSION_TYPE:      a.commission_type     ?? 'illustration',
    DELIVERY_FORMAT:      a.delivery_format     ?? '[delivery format]',
    DELIVERY_DATE:        a.delivery_date       ?? '[delivery date]',
    DELIVERY_METHOD:      'email',
    DELIVERY_TIMEFRAME:   '14 business days',
    // Payment
    CURRENCY:             currencySymbol,
    TOTAL_FEE:            totalFee ? `${totalFee}` : '[amount]',
    DEPOSIT_PERCENT:      `${depositPct}`,
    DEPOSIT_AMOUNT:       depositAmt,
    REVISION_COUNT:       a.revision_count      ?? '2',
    // Jurisdiction
    JURISDICTION_COUNTRY: a.jurisdiction        ?? 'US',
    JURISDICTION_STATE:   '',
    // Split
    SPLIT_A:              `${splitA}%`,
    SPLIT_B:              `${splitB}%`,
    // Attribution
    ATTRIBUTION_TEXT:     a.creator_name        ? `"${a.creator_name}"` : '[Creator Name]',
    // Meta
    PLATFORM:             a.platform            ?? 'direct',
    ASSET_TYPE:           a.license_type        ?? 'digital_asset',
    LICENSE_ID:           licenseId,
    GENERATED_DATE:       today,
    // lowercase aliases (some clause_maps use these)
    creator_name:         a.creator_name        ?? '[Creator Name]',
    client_name:          a.client_name         ?? '[Client Name]',
    product_name:         a.product_name        ?? '[Product Name]',
    total_fee:            totalFee ? `${totalFee}` : '[amount]',
    deposit_amount:       depositAmt,
    deposit_percent:      `${depositPct}`,
    revision_count:       a.revision_count      ?? '2',
  };

  return m;
}

// ─── Clause selection logic ───────────────────────────────────────────────────

interface ClauseMapEntry {
  label: string;
  legal_text: string;
  plain_text: string;
  enabled_by_default?: boolean;
  locked?: boolean;
}

function isClauseActive(key: string, entry: ClauseMapEntry, a: WizardAnswers): boolean {
  // Locked clauses always active
  if (entry.locked) return true;

  // Rights-type: exactly one of these should be active
  const rightsKeys = ['PERSONAL_LICENSE', 'COMMERCIAL_LICENSE', 'WORK_FOR_HIRE', 'FULL_TRANSFER'];
  if (rightsKeys.includes(key)) {
    const selectedRights = (a.rights_type ?? 'commercial_license').toUpperCase();
    return key === selectedRights;
  }

  // Toggle-driven clauses
  const toggleMap: Record<string, boolean | undefined> = {
    COMMERCIAL_USE:       a.commercial_use,
    PERSONAL_USE:         true, // always on for assets
    CLIENT_WORK:          a.client_work,
    PRINT_ON_DEMAND:      a.print_on_demand,
    NO_RESALE:            a.no_resale,
    NO_AI_TRAINING:       a.no_ai_training,
    NO_MODIFICATIONS_RESALE: a.no_resale,
    ATTRIBUTION_REQUIRED: a.attribution_required,
    ATTRIBUTION_OPTIONAL: !a.attribution_required,
    NO_NFT:               true, // default on for commissions
  };

  if (key in toggleMap) {
    return !!toggleMap[key];
  }

  // Default
  return entry.enabled_by_default !== false;
}

// ─── Jurisdiction & platform supplemental clauses ────────────────────────────

function injectSupplementalClauses(
  a: WizardAnswers,
  supplementalClauses: Array<{ slug: string; title: string; legal_text: string; plain_english: string; applies_to: string[] }>,
): ClauseEntry[] {
  const docType = a.license_type;
  const result: ClauseEntry[] = [];

  for (const c of supplementalClauses) {
    const appliesToDoc = c.applies_to.some((at: string) => at.includes(docType) || docType.includes(at.replace('_', '')));
    if (!appliesToDoc) continue;

    const slug = c.slug;

    // Jurisdiction governing law — only inject the matching one
    if (slug === 'commission-governing-law-us' && a.jurisdiction !== 'US') continue;
    if (slug === 'commission-governing-law-uk' && a.jurisdiction !== 'UK') continue;
    if (slug === 'collab-ip-assignment-uk'     && a.jurisdiction !== 'UK') continue;

    // Platform-specific
    if (slug === 'asset-gumroad-platform' && a.platform !== 'gumroad') continue;
    if (slug === 'asset-itchio-platform'  && a.platform !== 'itch')    continue;

    // Attribution gating
    if (slug === 'asset-attribution' && !a.attribution_required) continue;
    if (slug === 'asset-ai-disclosure' && !a.no_ai_training) continue;

    // Skip the general disclaimer here — injected separately at end
    if (slug === 'commission-disclaimer') continue;

    const legalText = c.legal_text ?? '';
    result.push({
      key:     slug.toUpperCase().replace(/-/g, '_'),
      label:   c.title,
      legalText,
      plainText: c.plain_english ?? '',
      source:  'clauses_table',
      locked:  false,
      hash:    sha256Short(legalText),
    });
  }

  return result;
}

// ─── Document assembly ────────────────────────────────────────────────────────

function assembleLegalText(
  heading: string,
  vars: Record<string, string>,
  clauses: ClauseEntry[],
): string {
  const today = vars.GENERATED_DATE ?? new Date().toLocaleDateString();
  const creatorName    = vars.CREATOR_NAME    ?? '[Creator]';
  const clientName     = vars.CLIENT_NAME     ?? '';
  const jurisdiction   = vars.JURISDICTION_COUNTRY ?? 'US';
  const licenseId      = vars.LICENSE_ID      ?? '';

  const govLaw = jurisdiction === 'UK'
    ? 'England and Wales'
    : jurisdiction === 'US' ? 'United States' : jurisdiction;

  const parties = clientName
    ? `**Between:** ${creatorName} ("Creator / Licensor") and ${clientName} ("Buyer / Client")`
    : `**Creator / Licensor:** ${creatorName}`;

  const sections = clauses.map((c, i) => {
    const t = resolveTokens(c.legalText, vars);
    return `**${i + 1}. ${c.label}**\n\n${t}`;
  });

  return [
    `# ${heading}`,
    ``,
    `**Generated by PactTailor** | ${today}`,
    `**Document ID:** ${licenseId}`,
    `**⚠️ Templates only — not legal advice** | pacttailor.com`,
    ``,
    `---`,
    ``,
    parties,
    `**Governing Law:** ${govLaw}`,
    `**Effective Date:** ${today}`,
    ``,
    `---`,
    ``,
    ...sections,
    ``,
    `---`,
    ``,
    `*This document was generated using PactTailor clause templates. It is NOT a substitute for legal advice.*`,
    `*License ID: ${licenseId} | pacttailor.com*`,
  ].join('\n');
}

function assemblePlainText(
  heading: string,
  vars: Record<string, string>,
  clauses: ClauseEntry[],
): string {
  const sections = clauses.map((c, i) => {
    const t = resolveTokens(c.plainText, vars);
    return `### ${i + 1}. ${c.label}\n${t}`;
  });

  return [
    `# ${heading} — Plain English Summary`,
    ``,
    `*What this contract says, in plain language (not legal advice):*`,
    ``,
    ...sections,
    ``,
    `---`,
    `*Full legal text available separately. Templates only — not legal advice.*`,
    `*Generated by PactTailor · pacttailor.com*`,
  ].join('\n');
}

// ─── Main generate function ───────────────────────────────────────────────────

export async function generateContract(
  answers: WizardAnswers,
  supabase: SupabaseClient,
): Promise<GeneratorResult> {
  const GENERATOR_VERSION = '2.0.0';

  // 1. Resolve template slug + fetch template
  const templateSlug = answers.template_slug ?? DEFAULT_TEMPLATE[answers.license_type] ?? 'game-asset-pack-commercial';

  const { data: template, error: tmplErr } = await supabase
    .from('templates')
    .select('id, name, document_type')
    .eq('slug', templateSlug)
    .single();

  if (tmplErr || !template) throw new Error(`Template not found: ${templateSlug} — ${JSON.stringify(tmplErr)}`);

  // 2. Fetch current template_version (with full clause_map)
  const { data: tv, error: tvErr } = await supabase
    .from('template_versions')
    .select('id, version, clause_map, variable_schema, changelog, diff_from_previous, template_hash, jurisdiction_codes, platform_codes, clause_hashes')
    .eq('template_id', template.id)
    .eq('is_current', true)
    .single();

  if (tvErr || !tv) throw new Error(`No current version found for template: ${templateSlug} — ${JSON.stringify(tvErr)}`);

  // 3. Build variable map
  const vars = buildVariableMap(answers);

  // 4. Select active clauses from clause_map
  const clauseMap = (tv.clause_map ?? {}) as Record<string, ClauseMapEntry>;
  const activeClauses: ClauseEntry[] = [];

  for (const [key, entry] of Object.entries(clauseMap)) {
    if (!isClauseActive(key, entry, answers)) continue;
    const legalText = entry.legal_text ?? '';
    activeClauses.push({
      key,
      label:     entry.label,
      legalText,
      plainText: entry.plain_text ?? '',
      source:    'template_version',
      locked:    !!entry.locked,
      hash:      sha256Short(legalText),
    });
  }

  // 5. Fetch supplemental clauses from the clauses table (jurisdiction + platform variants)
  const { data: suppClauses } = await supabase
    .from('clauses')
    .select('slug, title, legal_text, plain_english, applies_to, jurisdiction_codes, platform_codes')
    .or(`jurisdiction_codes.cs.{"${answers.jurisdiction}"},platform_codes.cs.{"${answers.platform}"}`);

  const supplemental = injectSupplementalClauses(answers, suppClauses ?? []);

  // Deduplicate by key — template_version takes precedence
  const existingKeys = new Set(activeClauses.map(c => c.key));
  for (const c of supplemental) {
    if (!existingKeys.has(c.key)) {
      activeClauses.push(c);
    }
  }

  // 6. Inject governing-law clause if not already present
  const hasGovLaw = activeClauses.some(c => c.key.includes('GOVERNING_LAW'));
  if (!hasGovLaw) {
    const govLawText = answers.jurisdiction === 'UK'
      ? 'This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising from this Agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.'
      : 'This Agreement shall be governed by and construed in accordance with the laws of the United States of America. The parties consent to personal jurisdiction in the courts of the state specified herein.';

    activeClauses.push({
      key:       'GOVERNING_LAW',
      label:     `Governing Law (${answers.jurisdiction === 'UK' ? 'England and Wales' : 'United States'})`,
      legalText: govLawText,
      plainText: answers.jurisdiction === 'UK'
        ? 'This contract is governed by English law.'
        : 'This contract is governed by US law.',
      source:    'injected',
      locked:    true,
      hash:      sha256Short(govLawText),
    });
  }

  // 7. Always append the disclaimer last
  const disclaimerText = 'THIS DOCUMENT IS A TEMPLATE ONLY AND DOES NOT CONSTITUTE LEGAL ADVICE. PactTailor provides document templates and clause libraries for informational purposes only. No attorney-client relationship is established by your use of PactTailor. Consult a licensed attorney for jurisdiction-specific legal guidance.';
  activeClauses.push({
    key:       'DISCLAIMER',
    label:     'Disclaimer — Not Legal Advice',
    legalText: disclaimerText,
    plainText: 'This is a template only — not legal advice. Consult a lawyer for your jurisdiction.',
    source:    'injected',
    locked:    true,
    hash:      sha256Short(disclaimerText),
  });

  // 8. Compute clause_hashes map
  const clauseHashes: Record<string, string> = {};
  for (const c of activeClauses) {
    clauseHashes[c.key] = c.hash;
  }

  // 9. Compute template_hash = SHA-256 of all clause legal texts concatenated in order
  const combinedText = activeClauses.map(c => resolveTokens(c.legalText, vars)).join('\n\n');
  const templateHash = sha256(combinedText);

  // 10. Compute provenance hash = SHA-256 of {templateSlug, version, clauseHashes, answers}
  const provenancePayload = {
    templateSlug,
    version:      tv.version,
    clauseHashes,
    answers,
    generatedAt:  new Date().toISOString(),
    generatorVersion: GENERATOR_VERSION,
  };
  const provenanceHash = sha256(JSON.stringify(provenancePayload));

  // 11. Build provenance chain
  const provenanceChain = {
    templateSlug,
    templateVersion:   tv.version,
    templateVersionId: tv.id,
    templateHash,
    clauseHashes,
    generatorVersion:  GENERATOR_VERSION,
    answersHash:       sha256(JSON.stringify(answers)).slice(0, 16),
    jurisdiction:      answers.jurisdiction,
    platform:          answers.platform,
    generatedAt:       new Date().toISOString(),
  };

  // 12. Build changelog from template_version
  const changelog: string[] = [];
  if (tv.changelog) changelog.push(`v${tv.version}: ${tv.changelog}`);
  if (tv.diff_from_previous) changelog.push(`Changes from previous: ${tv.diff_from_previous}`);

  // 13. Assemble final text
  const resolvedClauses = activeClauses.map(c => ({
    ...c,
    legalText: resolveTokens(c.legalText, vars),
    plainText: resolveTokens(c.plainText, vars),
  }));

  const legalText = assembleLegalText(template.name, vars, resolvedClauses);
  const plainText = assemblePlainText(template.name, vars, resolvedClauses);

  return {
    templateSlug,
    templateName:      template.name,
    templateVersion:   tv.version,
    templateVersionId: tv.id,
    legalText,
    plainText,
    clauses:           resolvedClauses,
    clauseHashes,
    templateHash,
    provenanceHash,
    provenanceChain,
    changelog,
    variablesResolved: vars,
    generatedAt:       new Date().toISOString(),
    generatorVersion:  GENERATOR_VERSION,
  };
}
