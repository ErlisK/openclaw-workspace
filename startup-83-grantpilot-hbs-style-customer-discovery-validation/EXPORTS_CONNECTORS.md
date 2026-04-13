# GrantPilot — Exports & Connectors Documentation

## Overview

GrantPilot provides 5 export formats and 3 portal connectors for submission packages.

---

## Export Formats

### 1. ZIP Submission Package (`/api/export/zip`)
**Endpoint**: `POST /api/export/zip`  
**Auth**: Bearer token (JWT)  
**Input**:
```json
{
  "application_id": "uuid",
  "include_sections": ["narrative", "budget", "forms", "checklist"]
}
```
**Output**: ZIP archive containing:
- `narrative/` — All narrative sections as `.docx` and `.pdf`
- `budget/` — SF-424A or SF-424C spreadsheet + justification PDF
- `forms/` — Pre-filled SF-424 and required attachments
- `checklist.pdf` — Compliance checklist with completion status
- `cover_sheet.pdf` — Summary with deadline, award amount, contact

**Use case**: Download everything needed for a manual portal submission.

---

### 2. PDF Narrative Export (`/api/narrative`)
**Endpoint**: `GET /api/narrative?application_id={id}&section={key}`  
**Auth**: Bearer token  
**Output**: PDF (or JSON source text) for a single narrative section  
**Formats**: `pdf`, `docx`, `markdown`, `json`  

---

### 3. Budget Export (`/api/budget`)
**Endpoint**: `GET /api/budget?application_id={id}&format=xlsx`  
**Auth**: Bearer token  
**Output**: Excel workbook with:
- Personnel tab (salary, FTE, fringe calculations)
- Non-personnel tab (supplies, travel, contractual)
- Indirect cost calculation (NICRA or de minimis)
- Summary tab matching SF-424A categories
- Budget Justification tab (plain-text narratives per line item)

---

### 4. Checklist Export (`/api/checklist`)
**Endpoint**: `GET /api/checklist?rfp_id={id}&format=pdf`  
**Auth**: Bearer token  
**Output**: Compliance checklist PDF showing:
- Each requirement from the RFP
- Completion status (✅ / ⏳ / ❌)
- Responsible section or attachment
- Due date for each item

---

### 5. Forms Pre-fill (`/api/forms/fill`)
**Endpoint**: `POST /api/forms/fill`  
**Auth**: Bearer token  
**Input**:
```json
{
  "form_type": "sf424",
  "application_id": "uuid"
}
```
**Supported forms**:
- `sf424` — Application for Federal Assistance
- `sf424a` — Budget Information (Non-Construction)
- `sf424b` — Assurances (Non-Construction)
- `sf424c` — Budget Information (Construction)
- `sf424d` — Assurances (Construction)
- `hud2880` — HUD Applicant/Recipient Disclosure
- `hud2993` — HUD Acknowledgment of Owner/Tenant
- `sf_lll` — Disclosure of Lobbying Activities

**Output**: Pre-filled PDF (using PDF form fields) + JSON field values

---

## Portal Connectors

### Connector 1: Grants.gov
**Status**: Read-only (submission planning)  
**Capabilities**:
- Search opportunities by CFDA, agency, keyword
- Download RFP packages via Grants.gov API
- Check SAM.gov registration status for an EIN
- Parse workspace packages (CFDA 14.xxx, 93.xxx, etc.)

**Config**:
```json
{
  "connector": "grantsgov",
  "api_key": "optional - uses public API if not set",
  "sam_unique_entity_id": "your UEI from SAM.gov"
}
```

**Endpoint**: `GET /api/rfp/parse?source=grantsgov&opportunity_id=XXX`

---

### Connector 2: eRA Commons (NIH)
**Status**: Read-only (RFP import)  
**Capabilities**:
- Import PA/RFA announcements from NIH Guide
- Parse review criteria and scoring rubrics
- Import page limit and format requirements

**Config**:
```json
{
  "connector": "era_commons",
  "announcement_id": "PA-24-XXX"
}
```

---

### Connector 3: Generic PDF/URL Import
**Status**: ✅ Live  
**Capabilities**:
- Upload any PDF RFP up to 50MB
- Fetch and parse any public URL
- Supports scanned PDFs via OCR (Tesseract fallback)
- Handles multi-file ZIP packages

**Endpoint**: `POST /api/rfp/parse`
```json
{
  "source": "upload | url",
  "url": "https://...",
  "file": "base64_encoded_pdf"
}
```

**Response**:
```json
{
  "rfp_id": "uuid",
  "title": "...",
  "funder_name": "...",
  "deadline": "2025-06-30",
  "max_award_usd": 500000,
  "cfda_number": "14.218",
  "eligibility": ["nonprofit 501c3", "operating in HUD-designated area"],
  "required_sections": [...],
  "scoring_rubric": [...],
  "compliance_items": [...],
  "warnings": [...],
  "confidence": "high | medium | low"
}
```

---

## Submission Package Assembly Workflow

```
1. Parse RFP → rfp_documents table
2. Create application → grant_applications table  
3. Generate narrative sections → narrative_sections table
4. Build budget → budget_items + budget_categories
5. Fill required forms → form_submissions table
6. Generate checklist → compliance_checklist_items
7. Request QA → orders table (specialist assigned)
8. QA approved → export/zip available
9. Download ZIP → manual portal upload
```

---

## API Authentication

All endpoints require a valid Supabase JWT in the `Authorization: Bearer` header.

Get a token:
```bash
curl -X POST https://zgqlnnftbkfnbtzlbaiy.supabase.co/auth/v1/token \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "you@org.com", "password": "...", "grant_type": "password"}'
```

---

## Rate Limits

| Endpoint | Free Tier | Paid |
|----------|-----------|------|
| `/api/rfp/parse` | 3/month | Unlimited |
| `/api/narrative` | 5 sections/month | Unlimited |
| `/api/budget` | 1 export/month | Unlimited |
| `/api/export/zip` | 0 (QA required) | Unlimited |
| Templates API | Unlimited | Unlimited |
