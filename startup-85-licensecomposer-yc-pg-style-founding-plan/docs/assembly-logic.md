# Contract Assembly Logic

**Last updated:** 2025-01-15  
**Location:** `apps/licensecomposer/lib/generator.ts`

---

## Overview

The LicenseComposer contract assembly pipeline converts wizard answers into a fully-resolved, provenance-tracked contract document. Assembly is **deterministic**: given the same inputs, the same contract is always produced.

---

## Pipeline Steps

### 1. Template Resolution

- Look up `template_versions` table for the active version of the requested `template_slug`.
- The version row contains a `clause_map` JSONB array defining the ordered set of clauses.
- Each `clause_map` entry has: `key`, `label`, `legal_text`, `plain_text`, `locked`, `default`, `requires` (conditional filter).

### 2. Clause Selection

Clauses are selected in priority order:

1. **Locked clauses** (`locked: true`) — always included regardless of wizard answers.
2. **Default clauses** (`default: true`) — included unless the wizard answer explicitly disables them.
3. **Conditional clauses** — included when the wizard answer satisfies the `requires` filter (e.g., `{exclusivity: 'exclusive'}`).
4. **Platform-specific clauses** — fetched from the `clauses` table where `platform_code @> [selected_platform]`.
5. **Jurisdiction-specific clauses** — fetched from `clauses` table where `jurisdiction_code = selected_jurisdiction`.

> **Important:** Only `lawyer_vetted` clauses are assembled into production contracts. `community` and `pending_review` clauses are seeded for testing but are never used in generated output.

### 3. Variable Resolution

All `{{TOKEN}}` placeholders in `legal_text` and `plain_text` are replaced using a variable map built from wizard answers:

| Token | Source |
|---|---|
| `{{CREATOR_NAME}}` | `answers.creator_name` |
| `{{PRODUCT_NAME}}` | `answers.product_name` |
| `{{CLIENT_NAME}}` | `answers.client_name` |
| `{{JURISDICTION}}` | `answers.jurisdiction` |
| `{{PLATFORM}}` | `answers.platform` |
| `{{EFFECTIVE_DATE}}` | today's date (US locale) |
| `{{LICENSE_ID}}` | auto-generated `PP-<timestamp-base36>` |
| `{{TOTAL_FEE}}` | `answers.total_fee` |
| `{{DEPOSIT_PERCENT}}` | `answers.deposit_percent` (default 50) |
| `{{DEPOSIT_AMOUNT}}` | computed: `total_fee × deposit_percent / 100` |
| `{{SPLIT_A_PERCENT}}` | `answers.split_a_percent` |
| `{{SPLIT_B_PERCENT}}` | `answers.split_b_percent` |
| `{{CURRENCY_SYMBOL}}` | `$` / `£` / `€` based on `answers.currency` |

Unresolved tokens render as `[TOKEN_NAME]` to make gaps visible during review.

### 4. Hash Computation

Each clause is hashed individually (SHA-256 of UTF-8 `legal_text`), then:

- **`clause_hashes`** — `{key: sha256(legal_text)}` map stored per contract
- **`template_hash`** — SHA-256 over JSON-canonicalized `clause_hashes`
- **`provenance_hash`** — SHA-256 over `{templateSlug, templateVersion, templateHash, generatedAt, generatorVersion}`

All hashes are stored in `generated_contracts` and embedded verbatim in exported PDFs and HTML files.

### 5. Output

The generator returns a `GeneratorResult`:

```typescript
interface GeneratorResult {
  templateSlug:      string;
  templateName:      string;
  templateVersion:   string;
  templateVersionId: string;
  legalText:         string;   // assembled full legal text
  plainText:         string;   // assembled plain-English text
  clauses:           ClauseEntry[];
  clauseHashes:      Record<string, string>;
  templateHash:      string;
  provenanceHash:    string;
  provenanceChain:   object;
  changelog:         string[];
  variablesResolved: Record<string, string>;
  generatedAt:       string;
  generatorVersion:  string;
}
```

---

## Jurisdiction Enforcement

**Server-side only.** Accepted values: `US`, `UK`. Any other value → HTTP 400:

```json
{ "error": "unsupported_jurisdiction", "message": "Jurisdiction 'CA' is not supported. Supported: US, UK." }
```

Enforced in `lib/jurisdiction.ts` and validated via Zod in `lib/validation.ts` before assembly begins.

---

## Supported Templates (v1 Seed)

| Slug | Name | Platforms | Jurisdictions |
|---|---|---|---|
| `commercial-asset-license` | Commercial Asset License | itch, gumroad, opensea | US, UK |
| `commissioned-work` | Commissioned Work Agreement | all | US, UK |
| `collaborator-split` | Collaborator Revenue Split | all | US, UK |

Each template is seeded with ≥12 `lawyer_vetted` base clauses and a small number of `community` clauses (not assembled, for UI testing only).

---

## Unit Tests

- `apps/licensecomposer/lib/__tests__/jurisdiction.test.ts` — jurisdiction validation (geofence 400 for CA, etc.)
- `scripts/rls-smoke-test.ts` — RLS cross-user isolation smoke tests

---

## Provenance Verification

After export, the embedded `content_hash` and `provenance_hash` can be verified at:

```
https://pactpack.com/verify/<first-16-chars-of-provenance-hash>
```

The `/verify/[hash]` page fetches the contract from `generated_contracts` and compares the stored hashes to confirm document integrity.
