/**
 * Austin ADU Permit Packet — Form Template
 *
 * Based on City of Austin Building Permit Application (BP-001)
 * and ADU-specific supplemental forms.
 *
 * Fields marked required:true are the "mandatory" set.
 * Source: https://www.austintexas.gov/department/residential-plan-review
 */

export interface FormField {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'
  required: boolean
  section: string
  options?: string[]
  hint?: string
  maxLength?: number
}

export interface FilledField extends FormField {
  value: string | number | boolean | null
  confidence: 'high' | 'medium' | 'low' | 'missing'
  source: string
}

// ── Austin BP-001: Building Permit Application ───────────────────────────────

export const AUSTIN_ADU_FORM_FIELDS: FormField[] = [
  // Section A: Project/Site Information
  { id: 'site_address',        label: 'Site Address',                type: 'text',   required: true,  section: 'A. Project Info', hint: 'Full street address' },
  { id: 'site_city',           label: 'City',                        type: 'text',   required: true,  section: 'A. Project Info' },
  { id: 'site_state',          label: 'State',                       type: 'text',   required: true,  section: 'A. Project Info' },
  { id: 'site_zip',            label: 'ZIP Code',                    type: 'text',   required: true,  section: 'A. Project Info' },
  { id: 'parcel_id',           label: 'Parcel / Prop ID',            type: 'text',   required: true,  section: 'A. Project Info' },
  { id: 'legal_description',   label: 'Legal Description',           type: 'text',   required: false, section: 'A. Project Info' },
  { id: 'subdivision_name',    label: 'Subdivision Name',            type: 'text',   required: false, section: 'A. Project Info' },
  { id: 'lot_number',          label: 'Lot/Block #',                 type: 'text',   required: false, section: 'A. Project Info' },
  { id: 'zoning_district',     label: 'Zoning District',             type: 'text',   required: true,  section: 'A. Project Info' },
  { id: 'council_district',    label: 'Council District',            type: 'text',   required: false, section: 'A. Project Info' },

  // Section B: Type of Work
  { id: 'work_type',           label: 'Type of Work',                type: 'select', required: true,  section: 'B. Type of Work',
    options: ['New Construction', 'Addition', 'Alteration', 'Renovation', 'Demolition', 'Change of Use'] },
  { id: 'use_type',            label: 'Use Type',                    type: 'select', required: true,  section: 'B. Type of Work',
    options: ['Single-Family Residential', 'Accessory Dwelling Unit', 'Multi-Family', 'Commercial', 'Mixed Use'] },
  { id: 'project_description', label: 'Project Description',         type: 'textarea', required: true, section: 'B. Type of Work', maxLength: 500 },
  { id: 'is_adu',              label: 'Accessory Dwelling Unit?',     type: 'checkbox', required: true, section: 'B. Type of Work' },
  { id: 'adu_type',            label: 'ADU Type',                    type: 'select', required: true,  section: 'B. Type of Work',
    options: ['Detached ADU (DADU)', 'Attached ADU', 'Garage Conversion', 'Junior ADU (JADU)', 'Conversion of Existing Space'] },

  // Section C: Building / Construction Data
  { id: 'existing_use',        label: 'Existing Use of Property',    type: 'text',   required: true,  section: 'C. Building Data' },
  { id: 'existing_sqft',       label: 'Existing Building Sq Ft',     type: 'number', required: false, section: 'C. Building Data' },
  { id: 'proposed_sqft',       label: 'Proposed ADU Sq Ft',          type: 'number', required: true,  section: 'C. Building Data' },
  { id: 'proposed_stories',    label: 'Number of Stories (ADU)',     type: 'number', required: true,  section: 'C. Building Data' },
  { id: 'proposed_bedrooms',   label: 'Bedrooms (ADU)',              type: 'number', required: true,  section: 'C. Building Data' },
  { id: 'proposed_bathrooms',  label: 'Bathrooms (ADU)',             type: 'number', required: true,  section: 'C. Building Data' },
  { id: 'construction_type',   label: 'Construction Type',           type: 'select', required: true,  section: 'C. Building Data',
    options: ['Type V-B (Wood Frame)', 'Type V-A', 'Type III-B', 'Type I-A', 'Type II-A'] },
  { id: 'occupancy_class',     label: 'Occupancy Classification',    type: 'text',   required: true,  section: 'C. Building Data', hint: 'e.g. R-3 for single family' },
  { id: 'lot_area_sqft',       label: 'Lot Area (sq ft)',            type: 'number', required: true,  section: 'C. Building Data' },
  { id: 'lot_coverage_pct',    label: 'Proposed Lot Coverage %',     type: 'number', required: false, section: 'C. Building Data' },
  { id: 'impervious_cover_pct',label: 'Proposed Impervious Cover %', type: 'number', required: false, section: 'C. Building Data' },
  { id: 'year_built_primary',  label: 'Year Primary Structure Built', type: 'number', required: false, section: 'C. Building Data' },

  // Section D: Setbacks / Site Plan Data
  { id: 'front_setback',       label: 'Front Setback (ft)',          type: 'number', required: true,  section: 'D. Setbacks', hint: 'Typically 25ft in SF zones' },
  { id: 'rear_setback',        label: 'Rear Setback (ft)',           type: 'number', required: true,  section: 'D. Setbacks', hint: 'Min 5ft for DADU' },
  { id: 'side_setback_left',   label: 'Left Side Setback (ft)',      type: 'number', required: true,  section: 'D. Setbacks', hint: 'Min 5ft' },
  { id: 'side_setback_right',  label: 'Right Side Setback (ft)',     type: 'number', required: true,  section: 'D. Setbacks', hint: 'Min 5ft' },
  { id: 'adu_height_ft',       label: 'ADU Max Height (ft)',         type: 'number', required: true,  section: 'D. Setbacks', hint: 'Max 0.9 × zone height limit' },
  { id: 'alley_access',        label: 'Alley Access Available?',     type: 'checkbox', required: false, section: 'D. Setbacks' },

  // Section E: Owner Information
  { id: 'owner_name',          label: 'Property Owner Name',         type: 'text',   required: true,  section: 'E. Owner Info' },
  { id: 'owner_email',         label: 'Owner Email',                 type: 'text',   required: true,  section: 'E. Owner Info' },
  { id: 'owner_phone',         label: 'Owner Phone',                 type: 'text',   required: false, section: 'E. Owner Info' },
  { id: 'owner_address',       label: 'Owner Mailing Address',       type: 'text',   required: false, section: 'E. Owner Info', hint: 'If different from project address' },
  { id: 'owner_occupied',      label: 'Owner-Occupied?',             type: 'checkbox', required: true, section: 'E. Owner Info', hint: 'Required for JADU in Austin' },

  // Section F: Contractor / Professional
  { id: 'contractor_name',     label: 'General Contractor Name',     type: 'text',   required: false, section: 'F. Contractor' },
  { id: 'contractor_license',  label: 'Contractor License #',        type: 'text',   required: false, section: 'F. Contractor' },
  { id: 'architect_name',      label: 'Architect / Designer',        type: 'text',   required: false, section: 'F. Contractor' },
  { id: 'architect_license',   label: 'Architect License #',         type: 'text',   required: false, section: 'F. Contractor' },

  // Section G: Valuation & Fees
  { id: 'construction_value',  label: 'Estimated Construction Value ($)', type: 'number', required: true, section: 'G. Valuation',
    hint: 'Used to calculate permit fee' },
  { id: 'fee_basis',           label: 'Fee Calculation Basis',       type: 'text',   required: false, section: 'G. Valuation' },

  // Section H: Utilities
  { id: 'water_connection',    label: 'New Water Connection?',       type: 'checkbox', required: true, section: 'H. Utilities' },
  { id: 'sewer_connection',    label: 'New Sewer Connection?',       type: 'checkbox', required: true, section: 'H. Utilities' },
  { id: 'electric_meter',      label: 'Separate Electric Meter?',    type: 'checkbox', required: false, section: 'H. Utilities' },

  // Section I: Special Conditions
  { id: 'floodplain',          label: 'In 100-yr Floodplain?',       type: 'checkbox', required: true,  section: 'I. Special Conditions' },
  { id: 'heritage_tree',       label: 'Heritage Tree on Lot?',       type: 'checkbox', required: true,  section: 'I. Special Conditions' },
  { id: 'hoa_approval',        label: 'HOA Approval Required?',      type: 'checkbox', required: false, section: 'I. Special Conditions' },
  { id: 'historic_district',   label: 'Historic District?',          type: 'checkbox', required: true,  section: 'I. Special Conditions' },
]

// Count of required fields
export const REQUIRED_FIELD_COUNT = AUSTIN_ADU_FORM_FIELDS.filter(f => f.required).length
