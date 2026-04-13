/**
 * SF-424 style PDF form fill using pdf-lib.
 * Creates a structured PDF that mimics the SF-424 layout.
 * For MVP: generates a filled PDF from org/application data.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'

export interface SF424Data {
  // Section 1: Submission type
  type_of_submission: 'Pre-application' | 'Application' | 'Changed/Corrected Application'
  type_of_application: 'New' | 'Continuation' | 'Revision'
  // Section 2: Dates
  date_received?: string
  applicant_identifier?: string
  federal_award_identifier?: string
  // Section 3: Dates
  date_received_by_state?: string
  state_application_identifier?: string
  // Section 4: Applicant
  org_legal_name: string
  employer_id: string
  uei?: string
  org_type: string
  org_address_street: string
  org_address_city: string
  org_address_state: string
  org_address_zip: string
  org_address_country?: string
  // Section 5: Employer
  congressional_district?: string
  // Section 6: Project
  project_title: string
  program_name?: string
  funding_opportunity_number?: string
  competition_id?: string
  cfda_number?: string
  funding_instrument?: string
  // Section 7: Project period
  project_start_date?: string
  project_end_date?: string
  // Section 8: Federal agency
  agency_name?: string
  organizational_unit?: string
  contact_last_name?: string
  contact_first_name?: string
  contact_phone?: string
  contact_email?: string
  // Section 9: Amounts
  federal_amount_requested: number
  nonfederal_amount?: number
  total_estimated_amount?: number
  // Section 10: Program income
  is_subject_to_review?: boolean
  // Section 11: Authorized rep
  auth_rep_name: string
  auth_rep_title: string
  auth_rep_org?: string
  auth_rep_phone?: string
  auth_rep_email?: string
  signature_date?: string
}

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  headerBg:    rgb(0.31, 0.27, 0.90),   // indigo-600
  headerText:  rgb(1, 1, 1),
  labelBg:     rgb(0.95, 0.95, 0.97),
  fieldBg:     rgb(1, 1, 1),
  border:      rgb(0.8, 0.8, 0.85),
  labelText:   rgb(0.4, 0.4, 0.5),
  valueText:   rgb(0.1, 0.1, 0.1),
  required:    rgb(0.8, 0.1, 0.1),
  sectionBg:   rgb(0.24, 0.21, 0.72),
}

export async function generateSF424PDF(data: SF424Data): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  let y = height - 20

  // ── Header ──────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: y - 40, width, height: 40, color: COLORS.headerBg })
  page.drawText('APPLICATION FOR FEDERAL ASSISTANCE', { x: 20, y: y - 26, size: 13, font: fontBold, color: COLORS.headerText })
  page.drawText('SF-424 (Rev. 3.0)', { x: width - 110, y: y - 26, size: 8, font, color: COLORS.headerText })
  y -= 50

  const drawLabel = (label: string, x: number, cy: number, w: number, labelH = 10) => {
    page.drawRectangle({ x, y: cy - labelH, width: w, height: labelH, color: COLORS.labelBg, borderColor: COLORS.border, borderWidth: 0.5 })
    page.drawText(label, { x: x + 3, y: cy - labelH + 2, size: 6.5, font, color: COLORS.labelText })
  }

  const drawField = (value: string, x: number, cy: number, w: number, fieldH = 14) => {
    page.drawRectangle({ x, y: cy - fieldH, width: w, height: fieldH, color: COLORS.fieldBg, borderColor: COLORS.border, borderWidth: 0.5 })
    const truncated = value.length > 60 ? value.slice(0, 57) + '...' : value
    page.drawText(truncated, { x: x + 3, y: cy - fieldH + 4, size: 8, font: fontBold, color: COLORS.valueText })
  }

  const drawSection = (num: string, title: string, cy: number) => {
    page.drawRectangle({ x: 0, y: cy - 12, width: width, height: 12, color: COLORS.sectionBg })
    page.drawText(`${num}. ${title.toUpperCase()}`, { x: 5, y: cy - 9, size: 7, font: fontBold, color: COLORS.headerText })
  }

  const row = (height: number) => { const old = y; y -= height; return old }

  // ── 1. Type of Submission ─────────────────────────────────────────────────
  drawSection('1', 'Type of Submission', row(14))
  const r1 = row(24)
  drawLabel('Type of Submission *', 0, r1, 200, 10)
  drawField(data.type_of_submission, 0, r1 - 10, 200)
  drawLabel('Type of Application *', 200, r1, 200, 10)
  drawField(data.type_of_application, 200, r1 - 10, 200)
  drawLabel('Date Received', 400, r1, 212, 10)
  drawField(data.date_received || new Date().toLocaleDateString(), 400, r1 - 10, 212)
  y -= 5

  // ── 2. Funding Opportunity ───────────────────────────────────────────────
  drawSection('2', 'Funding Opportunity Number / CFDA', row(14))
  const r2 = row(24)
  drawLabel('Funding Opportunity Number', 0, r2, 200)
  drawField(data.funding_opportunity_number || '', 0, r2 - 10, 200)
  drawLabel('CFDA / Assistance Listing Number', 200, r2, 200)
  drawField(data.cfda_number || '', 200, r2 - 10, 200)
  drawLabel('Competition Identification Number', 400, r2, 212)
  drawField(data.competition_id || '', 400, r2 - 10, 212)
  y -= 5

  // ── 3. Project Title ──────────────────────────────────────────────────────
  drawSection('3', 'Project Title', row(14))
  const r3 = row(24)
  drawLabel('Descriptive Title of Applicant\'s Project *', 0, r3, width)
  drawField(data.project_title, 0, r3 - 10, width)
  y -= 5

  // ── 4. Applicant Information ──────────────────────────────────────────────
  drawSection('4', 'Applicant Information', row(14))
  const r4a = row(24)
  drawLabel('Legal Name *', 0, r4a, 300)
  drawField(data.org_legal_name, 0, r4a - 10, 300)
  drawLabel('Employer/Taxpayer ID (EIN) *', 300, r4a, 160)
  drawField(data.employer_id, 300, r4a - 10, 160)
  drawLabel('UEI', 460, r4a, 152)
  drawField(data.uei || '', 460, r4a - 10, 152)
  y -= 2

  const r4b = row(24)
  drawLabel('Type of Applicant *', 0, r4b, 250)
  drawField(data.org_type, 0, r4b - 10, 250)
  drawLabel('Congressional District', 250, r4b, 362)
  drawField(data.congressional_district || '', 250, r4b - 10, 362)
  y -= 2

  const r4c = row(24)
  drawLabel('Street Address *', 0, r4c, width)
  drawField(data.org_address_street, 0, r4c - 10, width)
  y -= 2

  const r4d = row(24)
  drawLabel('City *', 0, r4d, 200)
  drawField(data.org_address_city, 0, r4d - 10, 200)
  drawLabel('State *', 200, r4d, 100)
  drawField(data.org_address_state, 200, r4d - 10, 100)
  drawLabel('ZIP Code *', 300, r4d, 150)
  drawField(data.org_address_zip, 300, r4d - 10, 150)
  drawLabel('Country', 450, r4d, 162)
  drawField(data.org_address_country || 'United States', 450, r4d - 10, 162)
  y -= 5

  // ── 5. Funding Request ────────────────────────────────────────────────────
  drawSection('5', 'Estimated Funding', row(14))
  const r5 = row(24)
  drawLabel('Federal ($) *', 0, r5, 150)
  drawField(`$${data.federal_amount_requested.toLocaleString()}`, 0, r5 - 10, 150)
  drawLabel('Applicant ($)', 150, r5, 150)
  drawField(data.nonfederal_amount ? `$${data.nonfederal_amount.toLocaleString()}` : '', 150, r5 - 10, 150)
  drawLabel('Total ($)', 300, r5, 150)
  drawField(data.total_estimated_amount ? `$${data.total_estimated_amount.toLocaleString()}` : `$${data.federal_amount_requested.toLocaleString()}`, 300, r5 - 10, 150)
  drawLabel('Program Income ($)', 450, r5, 162)
  drawField('$0', 450, r5 - 10, 162)
  y -= 5

  // ── 6. Project Period ─────────────────────────────────────────────────────
  drawSection('6', 'Project Period', row(14))
  const r6 = row(24)
  drawLabel('Proposed Start Date *', 0, r6, 200)
  drawField(data.project_start_date || '', 0, r6 - 10, 200)
  drawLabel('Proposed End Date *', 200, r6, 200)
  drawField(data.project_end_date || '', 200, r6 - 10, 200)
  drawLabel('Funding Instrument', 400, r6, 212)
  drawField(data.funding_instrument || 'Grant', 400, r6 - 10, 212)
  y -= 5

  // ── 7. Agency & Program ───────────────────────────────────────────────────
  drawSection('7', 'Federal Agency / Program', row(14))
  const r7 = row(24)
  drawLabel('Federal Agency Name', 0, r7, 300)
  drawField(data.agency_name || '', 0, r7 - 10, 300)
  drawLabel('Program Name', 300, r7, 312)
  drawField(data.program_name || '', 300, r7 - 10, 312)
  y -= 5

  // ── 8. Authorized Representative ─────────────────────────────────────────
  drawSection('8', 'Authorized Representative', row(14))
  const r8a = row(24)
  drawLabel('Name *', 0, r8a, 250)
  drawField(data.auth_rep_name, 0, r8a - 10, 250)
  drawLabel('Title *', 250, r8a, 362)
  drawField(data.auth_rep_title, 250, r8a - 10, 362)
  y -= 2

  const r8b = row(24)
  drawLabel('Phone *', 0, r8b, 200)
  drawField(data.auth_rep_phone || '', 0, r8b - 10, 200)
  drawLabel('Email *', 200, r8b, 200)
  drawField(data.auth_rep_email || '', 200, r8b - 10, 200)
  drawLabel('Signature Date *', 400, r8b, 212)
  drawField(data.signature_date || new Date().toLocaleDateString(), 400, r8b - 10, 212)
  y -= 10

  // ── Signature line ─────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 20, y }, end: { x: 300, y }, thickness: 0.5, color: COLORS.border })
  page.drawText('Signature of Authorized Representative', { x: 20, y: y - 10, size: 7, font, color: COLORS.labelText })
  y -= 30

  // ── Footer ─────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 20, color: COLORS.labelBg })
  page.drawText('GrantPilot — SF-424 Analog Form · For reference only · Submit through official grants.gov or agency portal', {
    x: 10, y: 6, size: 6, font, color: COLORS.labelText,
  })
  page.drawText(`Generated: ${new Date().toLocaleString()}`, { x: width - 120, y: 6, size: 6, font, color: COLORS.labelText })

  return pdfDoc.save()
}

// ─── SF-424A Budget Summary PDF ────────────────────────────────────────────────
export async function generateSF424APDF(data: {
  org_name: string
  project_title: string
  section_a_personnel: number
  section_a_fringe: number
  section_a_travel: number
  section_a_equipment: number
  section_a_supplies: number
  section_a_contractual: number
  section_a_construction: number
  section_a_other: number
  section_a_indirect: number
  federal_share: number
  nonfederal_share: number
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  let y = height - 20

  // Header
  page.drawRectangle({ x: 0, y: y - 40, width, height: 40, color: COLORS.headerBg })
  page.drawText('BUDGET INFORMATION FOR NON-CONSTRUCTION PROGRAMS', { x: 20, y: y - 22, size: 10, font: fontBold, color: COLORS.headerText })
  page.drawText('SF-424A (Rev. 7-97)', { x: width - 120, y: y - 30, size: 8, font, color: COLORS.headerText })
  y -= 55

  // Organization / Project
  const drawRow = (label: string, value: string, amount?: number) => {
    page.drawRectangle({ x: 0, y: y - 14, width: 330, height: 14, color: COLORS.labelBg, borderColor: COLORS.border, borderWidth: 0.5 })
    page.drawText(label, { x: 5, y: y - 10, size: 7.5, font, color: COLORS.labelText })
    page.drawRectangle({ x: 330, y: y - 14, width: 282, height: 14, color: COLORS.fieldBg, borderColor: COLORS.border, borderWidth: 0.5 })
    page.drawText(value, { x: 335, y: y - 10, size: 8, font: fontBold, color: COLORS.valueText })
    if (amount !== undefined) {
      page.drawText(`$${amount.toLocaleString()}`, { x: 530, y: y - 10, size: 8, font: fontBold, color: COLORS.valueText })
    }
    y -= 14
  }

  const drawMoney = (label: string, amount: number, isTotal = false) => {
    page.drawRectangle({ x: 0, y: y - 14, width: 350, height: 14, color: isTotal ? COLORS.sectionBg : COLORS.labelBg, borderColor: COLORS.border, borderWidth: 0.5 })
    page.drawText(label, { x: 5, y: y - 10, size: 7.5, font: isTotal ? fontBold : font, color: isTotal ? COLORS.headerText : COLORS.labelText })
    page.drawRectangle({ x: 350, y: y - 14, width: 262, height: 14, color: COLORS.fieldBg, borderColor: COLORS.border, borderWidth: 0.5 })
    page.drawText(`$${amount.toLocaleString()}`, { x: 490, y: y - 10, size: 8.5, font: fontBold, color: isTotal ? COLORS.sectionBg : COLORS.valueText })
    y -= 15
  }

  drawRow('Applicant Organization', data.org_name)
  drawRow('Project/Program Title', data.project_title)
  y -= 10

  page.drawText('SECTION A — BUDGET SUMMARY', { x: 5, y, size: 9, font: fontBold, color: COLORS.valueText })
  y -= 20

  const total = data.section_a_personnel + data.section_a_fringe + data.section_a_travel +
    data.section_a_equipment + data.section_a_supplies + data.section_a_contractual +
    data.section_a_construction + data.section_a_other

  drawMoney('a. Personnel', data.section_a_personnel)
  drawMoney('b. Fringe Benefits', data.section_a_fringe)
  drawMoney('c. Travel', data.section_a_travel)
  drawMoney('d. Equipment', data.section_a_equipment)
  drawMoney('e. Supplies', data.section_a_supplies)
  drawMoney('f. Contractual', data.section_a_contractual)
  drawMoney('g. Construction', data.section_a_construction)
  drawMoney('h. Other', data.section_a_other)
  drawMoney('i. TOTAL DIRECT CHARGES', total, true)
  drawMoney('j. Indirect Charges', data.section_a_indirect)
  drawMoney('k. TOTALS', total + data.section_a_indirect, true)
  y -= 10

  page.drawText('SECTION B — FEDERAL/NON-FEDERAL', { x: 5, y, size: 9, font: fontBold, color: COLORS.valueText })
  y -= 20
  drawMoney('Federal Share', data.federal_share)
  drawMoney('Non-Federal Share', data.nonfederal_share)
  drawMoney('TOTAL', data.federal_share + data.nonfederal_share, true)

  y -= 30
  page.drawLine({ start: { x: 20, y }, end: { x: 280, y }, thickness: 0.5, color: COLORS.border })
  page.drawText('Authorized Representative Signature', { x: 20, y: y - 10, size: 7, font, color: COLORS.labelText })
  page.drawLine({ start: { x: 320, y }, end: { x: 580, y }, thickness: 0.5, color: COLORS.border })
  page.drawText('Date', { x: 320, y: y - 10, size: 7, font, color: COLORS.labelText })

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 20, color: COLORS.labelBg })
  page.drawText('GrantPilot — SF-424A Analog · Budget Summary Form · For reference only', { x: 10, y: 6, size: 6, font, color: COLORS.labelText })
  page.drawText(`Generated: ${new Date().toLocaleString()}`, { x: width - 120, y: 6, size: 6, font, color: COLORS.labelText })

  return pdfDoc.save()
}
