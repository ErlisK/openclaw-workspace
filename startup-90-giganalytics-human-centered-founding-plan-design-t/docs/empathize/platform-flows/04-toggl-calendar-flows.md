# Platform Flow Archive: Toggl Track
## Time Tracking Flows, CSV Export Schema, and Calendar Integration

**Source:** Toggl Track documentation, Toggl API reference (engineering.toggl.com), Toggl Help Center, community usage patterns from public forums — verified April 2026  
**Relevance to GigAnalytics:** Toggl Track is the most widely used dedicated time tracker among freelancers and knowledge workers. The Service Freelancer proto-persona uses Toggl as their time tracking tool, but the data never connects to their income data — this disconnection is GigAnalytics' core opportunity.

---

## 1. Toggl Track Core Concepts

### Data Model
```
Workspace
  └── Projects (client or internal project)
        └── Tasks (optional subtask level)
              └── Time Entries (individual tracked sessions)
                    ├── description (what was worked on)
                    ├── start (timestamp)
                    ├── stop (timestamp)  
                    ├── duration (seconds)
                    ├── tags (array of tag strings)
                    └── billable (boolean flag)
```

### Entry Modes
- **Timer mode:** Click Start → works running → click Stop; duration calculated automatically
- **Manual mode:** Enter start time + end time or duration directly
- **Calendar blocks:** Toggl Track can import calendar events as time entries (see Calendar section)

---

## 2. CSV Export Schema

### Standard Toggl Track CSV Export
Access: Reports → Detailed → Export (CSV or XLSX)

**Available columns (Detailed Report):**

| Column | Description |
|--------|-------------|
| `User` | Toggl workspace member name |
| `Email` | User's Toggl email |
| `Client` | Client name (from Project's client field) |
| `Project` | Project name |
| `Task` | Task name (if task level used) |
| `Description` | Time entry description text |
| `Billable` | `Yes` / `No` |
| `Start date` | Date in YYYY-MM-DD format |
| `Start time` | Time in HH:MM:SS |
| `End date` | End date |
| `End time` | End time |
| `Duration` | Duration in HH:MM:SS format |
| `Tags` | Comma-separated tag list |
| `Amount (USD)` | Calculated amount if billing rate set (empty if no rate) |

### Summary Report CSV
Aggregated view:

| Column | Description |
|--------|-------------|
| `User` | Team member |
| `Client` | Client name |
| `Project` | Project name |
| `Duration` | Total hours HH:MM:SS |
| `Amount` | Billable amount if rate set |

### Date Range Limits
- Toggl allows export of any date range
- Large exports (>10,000 entries) may require multiple range downloads
- Free tier: access to up to 5 years of data
- Exports include UTC timestamps; Dashboard displays in user's local timezone

---

## 3. API Access

### Toggl Track API v9 (Current)

**Base URL:** `https://api.track.toggl.com/api/v9`  
**Auth:** HTTP Basic with API token (found in Profile Settings) + password `api_token`  
**Documentation:** `https://engineering.toggl.com/docs/`

### Key Endpoints for GigAnalytics

**List Time Entries (recent):**
```
GET /me/time_entries
Params: start_date, end_date (ISO 8601 timestamps)
Returns: Array of time entry objects
```

**Time Entry Object Schema:**
```json
{
  "id": 3456789012,
  "workspace_id": 1234567,
  "project_id": 9876543,
  "task_id": null,
  "billable": true,
  "start": "2024-03-15T09:00:00Z",
  "stop": "2024-03-15T11:30:00Z",
  "duration": 9000,
  "description": "Client call + proposal drafting",
  "tags": ["client-work", "admin"],
  "tag_ids": [123, 456],
  "duronly": false,
  "at": "2024-03-15T11:30:05Z",
  "uid": 12345678,
  "wid": 1234567,
  "pid": 9876543
}
```

**List Projects:**
```
GET /workspaces/{workspace_id}/projects
Returns: name, client_id, billable, rate, color, active
```

**List Clients:**
```
GET /workspaces/{workspace_id}/clients
Returns: id, name, wid, archived
```

**Reports API (separate endpoint):**
```
POST https://api.track.toggl.com/reports/api/v3/workspace/{workspace_id}/search/time_entries
Body: { start_date, end_date, client_ids, project_ids, billable, grouped }
Returns: detailed entries with project/client metadata populated
```

### OAuth for Third-Party Apps
Toggl supports OAuth 2.0 for third-party integrations:
- `Authorization: Bearer {access_token}` 
- Required scopes: `timer:read` (read-only for entries), `project:read`, `client:read`
- GigAnalytics would use this to pull time data without requiring API token

---

## 4. Billing Rate Architecture

### How Toggl Handles Rates
- **Workspace default rate:** Applied to all billable entries unless overridden
- **Project rate:** Per-project billing rate (overrides workspace rate)
- **User rate (team):** Per-user rate for team workspaces (overrides project rate)
- **Task rate:** Not available in current Toggl Track (was removed)

### Rate Application
- When a rate is set, `Amount (USD)` column in export = `duration × rate`
- Rates are stored as hourly USD values
- No support for project-based (fixed-price) billing calculation natively

**Critical gap:** Toggl can calculate `hours × rate = billed amount` but this is the stated hourly rate — it doesn't account for:
- Non-billable overhead hours associated with the client
- Whether the client actually paid this amount
- True effective rate when payment is different from estimate

---

## 5. Calendar Integration

### Toggl Track Calendar Integration (Built-in)
Toggl Track has a **Calendar view** that shows time entries alongside calendar events.

**Supported calendar integrations:**
- Google Calendar (OAuth, read-only sync)
- Outlook Calendar (read-only sync)
- Apple Calendar (read-only via iCal URL)

**How it works:**
1. User connects calendar via OAuth in Toggl Track Settings
2. Calendar events appear as grey blocks in the Toggl calendar view
3. User can click a calendar event to **create a time entry from it** (one-click)
4. The time entry inherits: event title (→ description), start time, end time
5. User still needs to assign: Project, Client, Tags, Billable flag

**Behavioral pattern observed in forums:**
- Most Toggl users DON'T use calendar integration proactively
- Calendar integration is used reactively: "I forgot to track that meeting — let me find it in calendar view and log it"
- Power users build workflows: Google Calendar → Zapier/Make → Toggl auto-entry creation

### Calendar → Toggl Time Entry Flow
```
Event: "Call with Acme Co — 2:00 PM"  (in Google Calendar)
  ↓ User switches to Toggl Calendar view
  ↓ Sees grey event block at 2:00 PM
  ↓ Clicks "Create time entry from this event"
  ↓ Entry created: description="Call with Acme Co", start=2:00 PM, end=3:00 PM
  ↓ User assigns project "Acme Co" and clicks "Save"
  ✓ 1 hour logged as billable client time
```

**GigAnalytics opportunity:** This same calendar inference pattern is a core GigAnalytics feature — "calendar inference" as a time input method. GigAnalytics could offer identical one-tap calendar-to-income-stream logging without requiring Toggl at all.

---

## 6. Common Usage Patterns (from Public Forum Analysis)

### How Freelancers Actually Use Toggl
Based on r/freelance, StackExchange, and Indie Hackers posts:

**Usage pattern 1: The disciplined timer**
- Starts Toggl for every work session; projects mapped to clients
- Uses billable toggle consistently
- Exports weekly summary for invoice creation
- Pain: "Toggl and my invoice tool don't sync; I have to manually copy hours"

**Usage pattern 2: The sporadic logger**
- Starts timer sometimes; often forgets to stop (sees 14-hour session next morning)
- Creates manual entries retroactively: "I think that meeting was about 90 minutes"
- Uses Toggl mainly for annual "how many hours did I work" check
- Pain: "My Toggl data is too unreliable to use for billing"

**Usage pattern 3: The calendar-native**
- Doesn't use Toggl timer; puts everything in Google Calendar
- Looks at calendar at end of week and mentally tallies hours
- Has never exported a CSV or connected to any tool
- Pain: "I know roughly how many hours I worked but I never know if the total is right"

**Usage pattern 4: The project-level tracker**
- Uses Toggl projects as client buckets
- Tracks at project level (not individual task level)
- "Client A: 12 hrs this week" — exports monthly for tax records
- Pain: "I don't know which specific tasks are actually billable vs overhead"

### Common Toggl-Adjacent Workflows
1. Toggl → FreshBooks/Wave invoicing: Manual copy of hours from Toggl report to invoice
2. Toggl + Zapier → Google Sheets: Automatic log of each entry to spreadsheet
3. Toggl + Clockify + Harvest comparison: Many freelancers have tried multiple tools and settled on Toggl for simplicity

---

## 7. GigAnalytics Integration Design

### What to Pull from Toggl
- All time entries with `billable=true` → directly associate with income stream
- All time entries with `billable=false` → overhead hours; reduce effective $/hr
- Project ↔ Client mapping → stream identification
- Tags → additional context (proposal, revision, admin, etc.)

### Key Mapping
```
toggl.project.name → income_stream (if matches Stripe/PayPal client name)
toggl.duration (seconds) / 3600 → hours_worked
toggl.billable = true → billable_hours
toggl.billable = false + toggl.tags contains "proposal" → proposal_overhead_hours
toggl.start → work_session_start_timestamp
```

### Stream Linking Challenge
Toggl project names and Stripe/PayPal client names are entered independently by the user — they often don't match:
- Toggl: "Acme Corp Redesign Project"
- Stripe: "Acme Corp"
- PayPal: "John Smith (Acme)"

GigAnalytics needs a one-time "link your Toggl projects to your income streams" mapping step, then auto-association thereafter.

### Calculation
```
effective_hourly_rate = 
  income_stream.net_income / (billable_hours + overhead_hours)

vs.

stated_hourly_rate = 
  income_stream.net_income / billable_hours_only

The gap between these is the "hidden overhead rate"
```

---

## 8. UX Flow: Toggl → GigAnalytics Income Analysis

```
User connects Toggl API in GigAnalytics onboarding
  ↓
GigAnalytics fetches last 90 days of time entries
  ↓
GigAnalytics shows: "Found 12 Toggl projects. 
  Match them to your income streams:"
  [Acme Corp Redesign] → [Stripe: Acme Corp payments] ✓ auto-suggested
  [NEFF Brand Work]    → [PayPal: NEFF Brand]         ✓ auto-suggested
  [Admin Tasks]        → [overhead — don't assign to stream]
  ↓
GigAnalytics calculates: "Acme Corp: 62 billable hrs + 8 overhead hrs = 70 total hrs"
  ↓
Correlates with income: "$6,200 received / 70 hrs = $88.57 effective $/hr"
  ↓
Surfaces: "Your stated rate is $115/hr. 
  After unbilled overhead, your effective rate is $88.57/hr (23% lower)"
```

This is the **primary value proposition for Service Freelancer persona** — and it only exists because Toggl + payment data are combined.

---

*Sources: Toggl Track Help Center, Toggl Engineering API docs (engineering.toggl.com), r/freelance discussion patterns, Toggl Feature Request forum — April 2026*
