/**
 * lib/jsonld.ts
 * Builds a JSON-LD (Schema.org) metadata object for a PactTailor generated contract.
 *
 * Schema used: schema.org/DigitalDocument + custom PactTailor provenance extensions.
 * Consumers can embed this as:
 *   - A <script type="application/ld+json"> tag in HTML
 *   - A metadata comment block in .txt / .md downloads
 *   - The response body of /api/verify
 */

export interface ContractProvenanceInput {
  documentId:        string;
  templateSlug:      string;
  templateName:      string;
  templateVersion:   string;
  documentType:      string;
  creatorName:       string | null;
  productName:       string | null;
  jurisdictionCode:  string | null;
  platformCode:      string | null;
  verificationHash:  string | null;
  templateHash:      string | null;
  clauseHashes:      Record<string, string> | null;
  changelog:         string[] | null;
  generatorVersion:  string | null;
  generatedAt:       string;
  appUrl?:           string;
  // Template version provenance
  tvVersion?:        string | null;
  tvChangelog?:      string | null;
  tvPublishedAt?:    string | null;
  tvLawyerName?:     string | null;
  tvLawyerReviewedAt?: string | null;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

/** Map PactTailor document_type to Schema.org additionalType */
function documentTypeToSchemaType(docType: string): string {
  const map: Record<string, string> = {
    digital_asset_license: 'DigitalDocument',
    commission_agreement:  'Contract',
    collaborator_split:    'Contract',
    nft_license:           'DigitalDocument',
  };
  return map[docType] ?? 'DigitalDocument';
}

/** Map jurisdiction code to full country name */
function jurisdictionLabel(code: string | null): string {
  if (!code) return 'Unknown';
  const map: Record<string, string> = {
    US: 'United States',
    UK: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
  };
  return map[code] ?? code;
}

/**
 * Build the full JSON-LD object.
 * This conforms to schema.org/DigitalDocument with PactTailor-specific provenance
 * extensions under the "pacttailor:" custom namespace.
 */
export function buildJsonLd(input: ContractProvenanceInput): object {
  const baseUrl = input.appUrl ?? APP_URL;
  const verifyUrl = input.verificationHash
    ? `${baseUrl}/verify/${input.verificationHash.slice(0, 16)}`
    : null;
  const apiVerifyUrl = input.verificationHash
    ? `${baseUrl}/api/verify/${input.verificationHash.slice(0, 16)}`
    : null;

  const clauseHashEntries = input.clauseHashes
    ? Object.entries(input.clauseHashes).map(([key, hash]) => ({
        '@type':     'PropertyValue',
        name:        key,
        value:       hash,
        description: 'SHA-256 (first 16 chars) of clause legal text at generation time',
      }))
    : [];

  return {
    '@context': {
      '@vocab':   'https://schema.org/',
      'pacttailor': 'https://pacttailor.com/ns/',
    },
    '@type':  documentTypeToSchemaType(input.documentType),

    // ── Schema.org standard fields ─────────────────────────────────
    name:           input.templateName,
    identifier:     input.documentId,
    url:            verifyUrl ?? `${baseUrl}/contracts/${input.documentId}`,
    dateCreated:    input.generatedAt,
    inLanguage:     'en',
    encodingFormat: 'text/plain',

    author: input.creatorName ? {
      '@type': 'Person',
      name:    input.creatorName,
    } : undefined,

    about: input.productName ? {
      '@type': 'CreativeWork',
      name:    input.productName,
    } : undefined,

    // Jurisdiction as countryOfOrigin / spatialCoverage
    spatialCoverage: {
      '@type': 'Place',
      name:    jurisdictionLabel(input.jurisdictionCode),
      identifier: input.jurisdictionCode ?? 'UNKNOWN',
    },

    // ── PactTailor provenance namespace ──────────────────────────────
    'pacttailor:provenance': {
      '@type': 'pacttailor:Provenance',

      'pacttailor:documentId':       input.documentId,
      'pacttailor:documentType':     input.documentType,
      'pacttailor:generatorVersion': input.generatorVersion ?? '2.0.0',
      'pacttailor:generatedAt':      input.generatedAt,
      'pacttailor:verificationHash': input.verificationHash ?? '',
      'pacttailor:templateHash':     input.templateHash ?? '',

      'pacttailor:template': {
        '@type':           'pacttailor:Template',
        'pacttailor:slug':   input.templateSlug,
        'pacttailor:version': input.tvVersion ?? input.templateVersion,
        'pacttailor:changelog': input.tvChangelog ?? (input.changelog?.join(' | ') ?? ''),
        'pacttailor:publishedAt': input.tvPublishedAt ?? null,
        'pacttailor:lawyerReviewed': !!input.tvLawyerName,
        'pacttailor:lawyerName': input.tvLawyerName ?? null,
        'pacttailor:lawyerReviewedAt': input.tvLawyerReviewedAt ?? null,
      },

      'pacttailor:jurisdiction': {
        '@type':           'pacttailor:Jurisdiction',
        'pacttailor:code':   input.jurisdictionCode ?? 'US',
        'pacttailor:label':  jurisdictionLabel(input.jurisdictionCode),
      },

      'pacttailor:platform':         input.platformCode ?? null,
      'pacttailor:changelog':        input.changelog ?? [],

      'pacttailor:clauseHashes': clauseHashEntries,

      'pacttailor:verificationUrl':  verifyUrl,
      'pacttailor:apiVerifyUrl':     apiVerifyUrl,

      'pacttailor:disclaimer':
        'This document was generated using PactTailor clause templates. ' +
        'It is NOT legal advice. Consult a licensed attorney for jurisdiction-specific guidance. ' +
        'pacttailor.com · hello@pacttailor.com',
    },

    // ── Verification link as potentialAction ──────────────────────
    potentialAction: verifyUrl ? {
      '@type':  'ViewAction',
      name:     'Verify Provenance',
      target:   verifyUrl,
    } : undefined,

    // ── Legal disclaimer as Schema.org disclaimer ──────────────────
    disclaimer:
      'Templates only — not legal advice. Consult a licensed attorney. ' +
      'Generated by PactTailor · pacttailor.com',
  };
}

/**
 * Serialize JSON-LD as a comment block suitable for embedding in
 * plain-text or Markdown files.
 */
export function jsonLdToDocumentComment(jsonLd: object): string {
  const json = JSON.stringify(jsonLd, null, 2);
  return [
    '',
    '<!--PACTPACK-PROVENANCE-BEGIN-->',
    '<!--',
    ' PactTailor Document Provenance Metadata (JSON-LD)',
    ' Verify at: ' + ((jsonLd as Record<string, unknown>)['pacttailor:provenance'] as Record<string, unknown>)?.['pacttailor:verificationUrl'],
    '-->',
    '<script type="application/ld+json">',
    json,
    '</script>',
    '<!--PACTPACK-PROVENANCE-END-->',
  ].join('\n');
}

/**
 * Serialize JSON-LD as a Markdown metadata section (human-readable + machine parseable).
 */
export function jsonLdToMarkdownBlock(jsonLd: object): string {
  const p = (jsonLd as Record<string, Record<string, unknown>>)['pacttailor:provenance'];
  const t = p?.['pacttailor:template'] as Record<string, unknown> ?? {};

  return [
    '',
    '---',
    '## Document Provenance',
    '',
    `**Document ID:** \`${p?.['pacttailor:documentId']}\``,
    `**Template:** ${t?.['pacttailor:slug']} v${t?.['pacttailor:version']}`,
    `**Generator:** PactTailor v${p?.['pacttailor:generatorVersion']}`,
    `**Generated:** ${p?.['pacttailor:generatedAt']}`,
    `**Jurisdiction:** ${(p?.['pacttailor:jurisdiction'] as Record<string, unknown>)?.['pacttailor:label'] ?? '—'}`,
    `**Platform:** ${p?.['pacttailor:platform'] ?? '—'}`,
    `**Verification hash:** \`${String(p?.['pacttailor:verificationHash']).slice(0, 32)}…\``,
    `**Template hash:** \`${String(p?.['pacttailor:templateHash']).slice(0, 32)}…\``,
    `**Verify at:** ${p?.['pacttailor:verificationUrl'] ?? '—'}`,
    '',
    `> ⚠️ Templates only — not legal advice. Consult a licensed attorney.`,
    `> Generated by PactTailor · pacttailor.com · hello@pacttailor.com`,
    '---',
    '',
    '<!-- JSON-LD provenance block (machine-readable) -->',
    '```json',
    JSON.stringify(jsonLd, null, 2),
    '```',
  ].join('\n');
}
