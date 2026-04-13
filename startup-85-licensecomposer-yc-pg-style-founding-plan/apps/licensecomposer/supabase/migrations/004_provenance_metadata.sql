-- Migration: 004_provenance_metadata.sql
-- Adds comprehensive provenance and verification metadata fields to:
--   generated_contracts, generated_licenses, template_versions, clauses, templates
-- Fields: jurisdiction_code, platform_code, template_id (denorm), version,
--         clause_hashes, changelog, generated_at, generator_version

-- =========================================================
-- generated_contracts — provenance additions
-- =========================================================

-- Short-code denormalized fields for fast lookup / embedding without joins
ALTER TABLE public.generated_contracts
  ADD COLUMN IF NOT EXISTS jurisdiction_code    TEXT,
  -- denormalized from jurisdictions.code e.g. 'US-CA'
  ADD COLUMN IF NOT EXISTS platform_code        TEXT,
  -- denormalized from platforms.slug e.g. 'gumroad'
  ADD COLUMN IF NOT EXISTS template_slug        TEXT,
  -- denormalized from templates.slug
  ADD COLUMN IF NOT EXISTS template_version     TEXT,
  -- e.g. '1.2.0' — human-readable version string
  ADD COLUMN IF NOT EXISTS clause_hashes        JSONB    NOT NULL DEFAULT '[]',
  -- [{slug, hash, version}] — SHA-256 of clause legal_text at generation time
  ADD COLUMN IF NOT EXISTS changelog            TEXT[],
  -- list of human-readable change notes vs previous version of this doc
  ADD COLUMN IF NOT EXISTS generated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- explicit generation timestamp (separate from created_at for import scenarios)
  ADD COLUMN IF NOT EXISTS generator_version    TEXT     NOT NULL DEFAULT '1.0.0',
  -- version of LicenseComposer that produced this doc
  ADD COLUMN IF NOT EXISTS provenance_verified  BOOLEAN  NOT NULL DEFAULT FALSE,
  -- flipped to TRUE when provenance_chain integrity is confirmed
  ADD COLUMN IF NOT EXISTS verification_hash    TEXT,
  -- final SHA-256 of (document_id || template_hash || clause_hashes || generated_at)
  ADD COLUMN IF NOT EXISTS verification_url     TEXT;
  -- absolute URL to the public license page for counterparty verification

-- Backfill jurisdiction_code from the FK for existing rows
UPDATE public.generated_contracts gc
SET jurisdiction_code = j.code
FROM public.jurisdictions j
WHERE gc.jurisdiction_id = j.id
  AND gc.jurisdiction_code IS NULL;

-- Backfill platform_code from the FK for existing rows
UPDATE public.generated_contracts gc
SET platform_code = p.slug
FROM public.platforms p
WHERE gc.platform_id = p.id
  AND gc.platform_code IS NULL;

-- Backfill template_slug from the FK for existing rows
UPDATE public.generated_contracts gc
SET template_slug = t.slug
FROM public.templates t
WHERE gc.template_id = t.id
  AND gc.template_slug IS NULL;

-- Backfill template_version from template_versions FK for existing rows
UPDATE public.generated_contracts gc
SET template_version = tv.version
FROM public.template_versions tv
WHERE gc.template_version_id = tv.id
  AND gc.template_version IS NULL;

-- =========================================================
-- generated_licenses — provenance additions
-- =========================================================

ALTER TABLE public.generated_licenses
  ADD COLUMN IF NOT EXISTS jurisdiction_code    TEXT,
  -- denormalized shortcode, mirrors generated_licenses.jurisdiction (legacy text field)
  ADD COLUMN IF NOT EXISTS platform_code        TEXT,
  -- denormalized, mirrors generated_licenses.platform (legacy text field)
  ADD COLUMN IF NOT EXISTS template_slug        TEXT,
  ADD COLUMN IF NOT EXISTS template_version     TEXT,
  ADD COLUMN IF NOT EXISTS clause_hashes        JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS changelog            TEXT[],
  ADD COLUMN IF NOT EXISTS generated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS generator_version    TEXT     NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS provenance_verified  BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_hash    TEXT,
  ADD COLUMN IF NOT EXISTS verification_url     TEXT;

-- Backfill from existing denorm columns
UPDATE public.generated_licenses gl
SET
  jurisdiction_code = COALESCE(gl.jurisdiction_code, gl.jurisdiction),
  platform_code     = COALESCE(gl.platform_code, gl.platform),
  template_slug     = t.slug,
  template_version  = tv.version
FROM public.templates t
LEFT JOIN public.template_versions tv
  ON tv.template_id = t.id AND tv.is_current = TRUE
WHERE gl.template_id = t.id
  AND gl.template_slug IS NULL;

-- =========================================================
-- template_versions — provenance additions
-- =========================================================

ALTER TABLE public.template_versions
  ADD COLUMN IF NOT EXISTS jurisdiction_codes   TEXT[]   NOT NULL DEFAULT '{}',
  -- jurisdictions this version has been reviewed/vetted for
  ADD COLUMN IF NOT EXISTS platform_codes       TEXT[]   NOT NULL DEFAULT '{}',
  -- platforms this version targets
  ADD COLUMN IF NOT EXISTS clause_hashes        JSONB    NOT NULL DEFAULT '[]',
  -- [{clause_slug, clause_id, hash, version}]
  ADD COLUMN IF NOT EXISTS clause_ids           UUID[]   NOT NULL DEFAULT '{}',
  -- ordered list of clause IDs included in this version
  ADD COLUMN IF NOT EXISTS generator_version    TEXT     NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS lawyer_name          TEXT,
  ADD COLUMN IF NOT EXISTS lawyer_reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS diff_from_previous   TEXT,
  -- human-readable diff summary vs previous version
  ADD COLUMN IF NOT EXISTS breaking_changes     BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deprecation_notice   TEXT;
  -- if non-null, this version is deprecated with a reason

-- =========================================================
-- clauses — provenance additions
-- =========================================================

ALTER TABLE public.clauses
  ADD COLUMN IF NOT EXISTS content_hash         TEXT,
  -- SHA-256 of (slug || version || legal_text) — stamped at insert/update
  ADD COLUMN IF NOT EXISTS changelog            TEXT[],
  -- array of human-readable change notes indexed by version
  ADD COLUMN IF NOT EXISTS generator_version    TEXT     NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS source_attribution   TEXT,
  -- e.g. 'Adapted from Creative Commons BY 4.0 template'
  ADD COLUMN IF NOT EXISTS review_notes         TEXT,
  -- lawyer review notes (internal, not shown publicly)
  ADD COLUMN IF NOT EXISTS deprecated_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by        UUID     REFERENCES public.clauses(id);

-- Stamp initial content_hash for seeded clauses
UPDATE public.clauses
SET content_hash = encode(
  digest(
    slug || '||' || version || '||' || legal_text,
    'sha256'
  ),
  'hex'
)
WHERE content_hash IS NULL;

-- Trigger: auto-update content_hash whenever clause content changes
CREATE OR REPLACE FUNCTION public.stamp_clause_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_hash := encode(
    digest(
      NEW.slug || '||' || NEW.version || '||' || NEW.legal_text,
      'sha256'
    ),
    'hex'
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clause_hash_stamp ON public.clauses;
CREATE TRIGGER clause_hash_stamp
  BEFORE INSERT OR UPDATE OF legal_text, version ON public.clauses
  FOR EACH ROW EXECUTE PROCEDURE public.stamp_clause_hash();

-- =========================================================
-- templates — provenance additions
-- =========================================================

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS current_version      TEXT     NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS changelog            TEXT[],
  ADD COLUMN IF NOT EXISTS generator_version    TEXT     NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS jurisdiction_codes   TEXT[]   NOT NULL DEFAULT '{}',
  -- canonical jurisdiction codes (separate from the legacy jurisdictions text[] column)
  ADD COLUMN IF NOT EXISTS platform_codes       TEXT[]   NOT NULL DEFAULT '{}',
  -- canonical platform codes (separate from the legacy platforms text[] column)
  ADD COLUMN IF NOT EXISTS template_hash        TEXT,
  -- hash of (slug || current_version || document_type)
  ADD COLUMN IF NOT EXISTS provenance_notes     TEXT;
  -- any provenance or sourcing notes

-- Stamp initial template_hash for existing templates
UPDATE public.templates
SET template_hash = encode(
  digest(
    slug || '||' || current_version || '||' || document_type,
    'sha256'
  ),
  'hex'
)
WHERE template_hash IS NULL;

-- Trigger: auto-update template_hash on slug/version/document_type change
CREATE OR REPLACE FUNCTION public.stamp_template_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.template_hash := encode(
    digest(
      NEW.slug || '||' || NEW.current_version || '||' || NEW.document_type,
      'sha256'
    ),
    'hex'
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS template_hash_stamp ON public.templates;
CREATE TRIGGER template_hash_stamp
  BEFORE INSERT OR UPDATE OF slug, current_version, document_type ON public.templates
  FOR EACH ROW EXECUTE PROCEDURE public.stamp_template_hash();

-- =========================================================
-- PROVENANCE VERIFICATION FUNCTION
-- Call: SELECT verify_contract_provenance(contract_id)
-- Returns: {valid: bool, issues: text[]}
-- =========================================================
CREATE OR REPLACE FUNCTION public.verify_contract_provenance(p_contract_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_contract  public.generated_contracts%ROWTYPE;
  v_issues    TEXT[] := ARRAY[]::TEXT[];
  v_expected_hash TEXT;
BEGIN
  SELECT * INTO v_contract FROM public.generated_contracts WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', FALSE, 'issues', ARRAY['contract not found']);
  END IF;

  -- 1. Verify document_id is set
  IF v_contract.document_id IS NULL OR v_contract.document_id = '' THEN
    v_issues := v_issues || 'document_id missing';
  END IF;

  -- 2. Verify template_slug matches template
  IF v_contract.template_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.templates t
      WHERE t.id = v_contract.template_id
        AND (v_contract.template_slug IS NULL OR t.slug = v_contract.template_slug)
    ) THEN
      v_issues := v_issues || 'template_slug does not match template_id';
    END IF;
  END IF;

  -- 3. Verify jurisdiction_code matches jurisdiction_id
  IF v_contract.jurisdiction_id IS NOT NULL AND v_contract.jurisdiction_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.jurisdictions j
      WHERE j.id = v_contract.jurisdiction_id
        AND j.code = v_contract.jurisdiction_code
    ) THEN
      v_issues := v_issues || 'jurisdiction_code does not match jurisdiction_id';
    END IF;
  END IF;

  -- 4. Verify platform_code matches platform_id
  IF v_contract.platform_id IS NOT NULL AND v_contract.platform_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.platforms p
      WHERE p.id = v_contract.platform_id
        AND p.slug = v_contract.platform_code
    ) THEN
      v_issues := v_issues || 'platform_code does not match platform_id';
    END IF;
  END IF;

  -- 5. Verify verification_hash if present
  IF v_contract.verification_hash IS NOT NULL THEN
    v_expected_hash := encode(
      digest(
        v_contract.document_id || '||'
          || COALESCE(v_contract.template_hash, '') || '||'
          || COALESCE(v_contract.clause_hashes::text, '[]') || '||'
          || COALESCE(v_contract.template_version, '') || '||'
          || to_char(v_contract.generated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'sha256'
      ),
      'hex'
    );
    IF v_contract.verification_hash != v_expected_hash THEN
      v_issues := v_issues || 'verification_hash mismatch — document may have been tampered';
    END IF;
  END IF;

  -- Mark as verified if no issues
  IF array_length(v_issues, 1) IS NULL THEN
    UPDATE public.generated_contracts
    SET provenance_verified = TRUE
    WHERE id = p_contract_id;
    RETURN jsonb_build_object('valid', TRUE, 'issues', ARRAY[]::TEXT[]);
  ELSE
    RETURN jsonb_build_object('valid', FALSE, 'issues', v_issues);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- INDEXES for new provenance columns
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_gc_jurisdiction_code ON public.generated_contracts (jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_gc_platform_code     ON public.generated_contracts (platform_code);
CREATE INDEX IF NOT EXISTS idx_gc_template_slug     ON public.generated_contracts (template_slug);
CREATE INDEX IF NOT EXISTS idx_gc_generated_at      ON public.generated_contracts (generated_at);
CREATE INDEX IF NOT EXISTS idx_gc_generator_version ON public.generated_contracts (generator_version);
CREATE INDEX IF NOT EXISTS idx_gc_verified          ON public.generated_contracts (provenance_verified);

CREATE INDEX IF NOT EXISTS idx_gl_jurisdiction_code ON public.generated_licenses (jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_gl_platform_code     ON public.generated_licenses (platform_code);
CREATE INDEX IF NOT EXISTS idx_gl_generated_at      ON public.generated_licenses (generated_at);

CREATE INDEX IF NOT EXISTS idx_clauses_content_hash ON public.clauses (content_hash);
CREATE INDEX IF NOT EXISTS idx_templates_hash       ON public.templates (template_hash);

-- =========================================================
-- COMMENT DOCUMENTATION
-- =========================================================
COMMENT ON COLUMN public.generated_contracts.jurisdiction_code IS
  'Denormalized jurisdiction code (e.g. US-CA) from jurisdictions.code. Set at generation time and immutable.';
COMMENT ON COLUMN public.generated_contracts.platform_code IS
  'Denormalized platform code (e.g. gumroad) from platforms.slug. Set at generation time and immutable.';
COMMENT ON COLUMN public.generated_contracts.clause_hashes IS
  'JSON array of {slug, hash, version} for each clause used. SHA-256 of clause legal_text at generation time.';
COMMENT ON COLUMN public.generated_contracts.generator_version IS
  'LicenseComposer application version that generated this document. Used for regression detection.';
COMMENT ON COLUMN public.generated_contracts.verification_hash IS
  'SHA-256(document_id || template_hash || clause_hashes || template_version || generated_at). Used by verify_contract_provenance().';
COMMENT ON COLUMN public.generated_contracts.changelog IS
  'Array of human-readable change notes relative to previous version of this document. Null for v1.';
COMMENT ON COLUMN public.clauses.content_hash IS
  'SHA-256(slug || version || legal_text). Auto-stamped by trigger on INSERT/UPDATE. Used to detect clause drift.';
COMMENT ON COLUMN public.templates.template_hash IS
  'SHA-256(slug || current_version || document_type). Auto-stamped on slug/version/document_type change.';
