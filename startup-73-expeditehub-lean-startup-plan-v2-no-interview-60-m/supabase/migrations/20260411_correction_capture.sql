-- ============================================================
-- ExpediteHub: Correction Letters + Field-Level Tagging
-- ============================================================

-- 1. CORRECTION LETTERS TABLE
-- Stores uploaded DSD correction letters linked to a project/quote
CREATE TABLE IF NOT EXISTS public.correction_letters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  project_id      uuid NOT NULL,
  quote_id        uuid,                  -- which pro's quote this applies to
  uploaded_by     text NOT NULL,         -- email of uploader
  uploader_role   text NOT NULL DEFAULT 'pro',  -- 'pro' | 'homeowner' | 'admin'
  file_url        text NOT NULL,         -- Supabase Storage public URL
  file_name       text NOT NULL,
  file_size_bytes integer,
  mime_type       text,
  correction_date date,                  -- date on the DSD letter (if parsed)
  case_number     text,                  -- Austin DSD case/permit number
  status          text NOT NULL DEFAULT 'pending_review',
  -- 'pending_review' | 'extracting' | 'extracted' | 'tagged' | 'resolved'
  raw_text        text,                  -- full extracted text (LLM/OCR output)
  extraction_model text,                 -- e.g. 'gpt-4o-mini', 'stub'
  extracted_at    timestamptz,
  notes           text
);

-- 2. CORRECTION FIELD TAGS TABLE
-- Each row = one field correction identified in a letter
CREATE TABLE IF NOT EXISTS public.correction_field_tags (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  correction_letter_id uuid NOT NULL REFERENCES public.correction_letters(id) ON DELETE CASCADE,
  project_id          uuid NOT NULL,
  field_key           text NOT NULL,        -- matches form_template field key, e.g. 'impervious_cover_pct'
  field_label         text NOT NULL,        -- human-readable label
  original_value      text,                 -- what was submitted
  corrected_value     text,                 -- what DSD says it should be (if specified)
  correction_note     text NOT NULL,        -- DSD's comment/reason
  severity            text NOT NULL DEFAULT 'required',  -- 'required' | 'advisory'
  source              text NOT NULL DEFAULT 'manual',    -- 'manual' | 'llm_extracted' | 'ocr'
  resolved            boolean NOT NULL DEFAULT false,
  resolved_at         timestamptz,
  resolved_by         text
);

-- 3. Enable RLS (service role bypasses)
ALTER TABLE public.correction_letters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correction_field_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "correction_letters: public read"  ON public.correction_letters FOR SELECT USING (true);
CREATE POLICY "correction_letters: service write" ON public.correction_letters FOR ALL USING (true);

CREATE POLICY "correction_tags: public read"  ON public.correction_field_tags FOR SELECT USING (true);
CREATE POLICY "correction_tags: service write" ON public.correction_field_tags FOR ALL USING (true);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS correction_letters_project_id  ON public.correction_letters(project_id);
CREATE INDEX IF NOT EXISTS correction_tags_letter_id      ON public.correction_field_tags(correction_letter_id);
CREATE INDEX IF NOT EXISTS correction_tags_project_id     ON public.correction_field_tags(project_id);
CREATE INDEX IF NOT EXISTS correction_tags_field_key      ON public.correction_field_tags(field_key);
CREATE INDEX IF NOT EXISTS correction_tags_resolved       ON public.correction_field_tags(resolved);
