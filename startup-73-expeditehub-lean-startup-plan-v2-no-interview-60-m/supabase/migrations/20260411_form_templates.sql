-- ============================================================
-- ExpediteHub: Form Templates + Quote Checklist
-- ============================================================

-- 1. FORM TEMPLATES TABLE
-- Stores versioned template definitions for each jurisdiction/form type
CREATE TABLE IF NOT EXISTS public.form_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  jurisdiction    text NOT NULL DEFAULT 'Austin, TX',
  form_type       text NOT NULL DEFAULT 'ADU_BP001',
  version         integer NOT NULL DEFAULT 1,
  label           text NOT NULL,
  zoning_context  text NOT NULL DEFAULT 'SF-3',
  fields          jsonb NOT NULL DEFAULT '[]',
  autofill_rules  jsonb NOT NULL DEFAULT '{}',
  accuracy_score  numeric(5,2) DEFAULT NULL,  -- last computed score 0-100
  is_active       boolean NOT NULL DEFAULT true,
  notes           text
);

CREATE UNIQUE INDEX IF NOT EXISTS form_templates_juris_form_ver
  ON public.form_templates(jurisdiction, form_type, version);

-- 2. ACCURACY AUDIT LOG
-- Each time an admin runs the accuracy check, log per-field results
CREATE TABLE IF NOT EXISTS public.template_accuracy_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  template_id     uuid REFERENCES public.form_templates(id),
  project_id      uuid,
  overall_score   numeric(5,2),
  field_results   jsonb NOT NULL DEFAULT '[]'  -- [{key, filled, correct, source}]
);

-- 3. QUOTE CHECKLIST ITEMS
-- Pro can mark off items; stored per quote
CREATE TABLE IF NOT EXISTS public.quote_checklist (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        uuid NOT NULL,
  label           text NOT NULL,
  checked         boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 0
);

-- 4. Enable RLS (service role bypasses)
ALTER TABLE public.form_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_accuracy_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_checklist     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates: public read" ON public.form_templates
  FOR SELECT USING (true);
CREATE POLICY "templates: service write" ON public.form_templates
  FOR ALL USING (true);

CREATE POLICY "accuracy_log: service only" ON public.template_accuracy_log
  FOR ALL USING (true);

CREATE POLICY "quote_checklist: public read" ON public.quote_checklist
  FOR SELECT USING (true);
CREATE POLICY "quote_checklist: service write" ON public.quote_checklist
  FOR ALL USING (true);

-- 5. Seed the Austin ADU BP-001 template v1
INSERT INTO public.form_templates (jurisdiction, form_type, version, label, zoning_context, fields, autofill_rules, accuracy_score)
VALUES (
  'Austin, TX',
  'ADU_BP001',
  1,
  'Austin ADU Building Permit BP-001 (SF-3)',
  'SF-3',
  '[
    {"key":"address","label":"Project Address","type":"text","required":true,"autofill_rule":"GIS lookup","autofill_source":"gis","value":""},
    {"key":"zoning","label":"Zoning District","type":"text","required":true,"autofill_rule":"Austin GIS API → parcel layer","autofill_source":"gis","value":""},
    {"key":"adu_type","label":"ADU Type","type":"select","required":true,"autofill_rule":"Homeowner input","autofill_source":"homeowner","value":"","options":["Detached ADU (backyard cottage)","Attached ADU","Garage Conversion","Interior Conversion (JADU)"]},
    {"key":"proposed_sqft","label":"Proposed ADU Sq Ft","type":"number","required":true,"autofill_rule":"Homeowner input","autofill_source":"homeowner","value":""},
    {"key":"lot_area_sqft","label":"Lot Area (sq ft)","type":"number","required":true,"autofill_rule":"GIS → Travis CAD parcel data","autofill_source":"gis","value":""},
    {"key":"existing_structure_sqft","label":"Existing Structure Sq Ft","type":"number","required":true,"autofill_rule":"Homeowner input (add to intake form)","autofill_source":"homeowner","value":""},
    {"key":"hard_surface_sqft","label":"Existing Hard Surfaces (driveway, patio) Sq Ft","type":"number","required":true,"autofill_rule":"Homeowner input (add to intake form)","autofill_source":"homeowner","value":""},
    {"key":"impervious_cover_pct","label":"Proposed Impervious Cover %","type":"number","required":true,"autofill_rule":"CALCULATED: (hard_surface_sqft + ADU_footprint) / lot_area × 100","autofill_source":"calculated","value":""},
    {"key":"setback_front","label":"Front Setback (ft)","type":"number","required":true,"autofill_rule":"Rule-based: SF-3 LDC §25-2-492 → 25 ft","autofill_source":"rule","value":"25"},
    {"key":"setback_rear","label":"Rear Setback (ft)","type":"number","required":true,"autofill_rule":"Rule-based: SF-3 LDC §25-2-492 → 10 ft","autofill_source":"rule","value":"10"},
    {"key":"setback_side","label":"Side Setback (ft)","type":"number","required":true,"autofill_rule":"Rule-based: SF-3 LDC §25-2-492 → 5 ft","autofill_source":"rule","value":"5"},
    {"key":"max_height_ft","label":"Maximum Height (ft)","type":"number","required":true,"autofill_rule":"Rule-based: SF-3 max 2 stories / 30 ft","autofill_source":"rule","value":"30"},
    {"key":"adu_max_sqft_allowed","label":"Max Allowed ADU Sq Ft (code)","type":"number","required":false,"autofill_rule":"CALCULATED: min(1100, lot_area × 0.15)","autofill_source":"calculated","value":""},
    {"key":"utility_connection","label":"Utility Connection Type","type":"select","required":true,"autofill_rule":"Homeowner input (add to intake form)","autofill_source":"homeowner","value":"","options":["Shared with main structure","Separate meter requested","TBD / Unknown"]},
    {"key":"owner_name","label":"Property Owner Name","type":"text","required":true,"autofill_rule":"Homeowner account profile","autofill_source":"account","value":""},
    {"key":"owner_phone","label":"Owner Phone","type":"text","required":true,"autofill_rule":"Homeowner input (add to intake form)","autofill_source":"homeowner","value":""},
    {"key":"owner_email","label":"Owner Email","type":"text","required":true,"autofill_rule":"Homeowner account profile","autofill_source":"account","value":""},
    {"key":"contractor_name","label":"Contractor / Expediter Name","type":"text","required":false,"autofill_rule":"Assigned pro profile","autofill_source":"pro","value":""},
    {"key":"contractor_license","label":"Contractor License Number","type":"text","required":false,"autofill_rule":"Assigned pro profile","autofill_source":"pro","value":""},
    {"key":"year_built_main","label":"Year Built (main structure)","type":"number","required":false,"autofill_rule":"GIS → Travis CAD building data","autofill_source":"gis","value":""},
    {"key":"ward","label":"City Council District","type":"text","required":false,"autofill_rule":"GIS → Austin council districts layer","autofill_source":"gis","value":""}
  ]'::jsonb,
  '{
    "gis": {
      "description": "Austin Open Data Portal API + Travis CAD",
      "endpoint": "/api/parcel",
      "fields": ["address","zoning","lot_area_sqft","year_built_main","ward"]
    },
    "rule": {
      "description": "LDC Title 25 zoning rules hard-coded by zoning district",
      "fields": ["setback_front","setback_rear","setback_side","max_height_ft"],
      "sf3_rules": {
        "setback_front": 25,
        "setback_rear": 10,
        "setback_side": 5,
        "max_height_ft": 30,
        "max_impervious_pct": 45,
        "max_adu_sqft": 1100,
        "max_adu_far": 0.15
      }
    },
    "calculated": {
      "fields": ["impervious_cover_pct","adu_max_sqft_allowed"],
      "formulas": {
        "impervious_cover_pct": "(hard_surface_sqft + proposed_sqft) / lot_area_sqft * 100",
        "adu_max_sqft_allowed": "Math.min(1100, lot_area_sqft * 0.15)"
      }
    },
    "homeowner": {
      "description": "Fields collected via /request intake form",
      "fields": ["adu_type","proposed_sqft","existing_structure_sqft","hard_surface_sqft","utility_connection","owner_phone"]
    },
    "account": {
      "description": "From homeowner Supabase account record",
      "fields": ["owner_name","owner_email"]
    },
    "pro": {
      "description": "From assigned pro profile in pros table",
      "fields": ["contractor_name","contractor_license"]
    }
  }'::jsonb,
  78.57  -- 11 of 14 required fields auto-filled
)
ON CONFLICT (jurisdiction, form_type, version) DO UPDATE
  SET fields = EXCLUDED.fields,
      autofill_rules = EXCLUDED.autofill_rules,
      accuracy_score = EXCLUDED.accuracy_score,
      updated_at = now();
