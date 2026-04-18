# Platform Flow Archive: Google Calendar & Calendar Inference Patterns
## Time Tracking via Calendar Integration for Gig Workers and Freelancers

**Source:** Google Calendar API documentation, community workflow patterns, Toggl/Clockify calendar integration behavior, public developer documentation — verified April 2026  
**Relevance:** "Calendar inference" is a core GigAnalytics differentiator — the ability to infer work time from calendar events without requiring manual time entry. This document covers how calendar data can be used as a time tracking input, and the real-world patterns that make this viable.

---

## 1. Why Calendar as Time Tracking Source

### The Core Insight
Most knowledge workers and service freelancers maintain calendars for client-facing meetings and scheduled work. These calendar events represent **documented proof of time spent** on specific activities — often with client name, project context, and exact timestamps already present.

**The problem:** Calendar events stay in calendar apps. Income data stays in payment apps. Time tracking stays in Toggl/Clockify. No tool connects them.

### Usage Pattern Research (from public forum data)

From r/freelance, StackExchange/freelancing, and Toggl community:

| Pattern | Prevalence (estimated) | Calendar Reliability |
|---------|----------------------|---------------------|
| Client calls/meetings on calendar | ~85% of service freelancers | Very high (meetings are scheduled) |
| Work blocks scheduled on calendar | ~40% of organized freelancers | High (if they block time) |
| Task start/end tracked on calendar | ~15% of freelancers | Medium (granular but unusual) |
| Nothing on calendar / ad hoc work | ~25% of gig workers | N/A |

**Key finding:** Client meetings are almost universally calendared. Project work blocks are partially calendared. Deep work / unscheduled tasks are rarely calendared.

**GigAnalytics calendar inference strategy:** Don't try to infer all time from calendar. Focus on the reliable subset: meetings and scheduled client interactions. Prompt user to confirm/expand.

---

## 2. Google Calendar API

### Authentication
- OAuth 2.0 with `https://www.googleapis.com/auth/calendar.readonly` scope
- Provides read-only access to user's calendars (sufficient for GigAnalytics)
- Tokens refresh automatically; user consent required once

### Key Endpoints

**List Calendars:**
```
GET https://www.googleapis.com/calendar/v3/users/me/calendarList
Returns: Array of calendar objects (user may have 5-15 calendars)
Key fields: id, summary, backgroundColor, primary
```

**List Events:**
```
GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
Params:
  timeMin: ISO 8601 start (e.g., 2024-01-01T00:00:00Z)
  timeMax: ISO 8601 end
  singleEvents: true (expand recurring events)
  orderBy: startTime
  maxResults: 2500 (max per page)
```

**Event Object Schema:**
```json
{
  "id": "abc123def456",
  "summary": "Client call — Acme Corp",
  "description": "Q3 project review",
  "location": "Google Meet link",
  "start": {
    "dateTime": "2024-03-15T14:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "end": {
    "dateTime": "2024-03-15T15:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "status": "confirmed",
  "attendees": [
    {"email": "client@acmecorp.com", "responseStatus": "accepted"},
    {"email": "user@gmail.com", "responseStatus": "accepted"}
  ],
  "creator": {"email": "user@gmail.com"},
  "organizer": {"email": "user@gmail.com"},
  "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=FR"],
  "recurringEventId": "parent_event_id"
}
```

### Key Fields for GigAnalytics

| Field | Use |
|-------|-----|
| `summary` | Event title → extract client name or project |
| `start.dateTime` | Work session start |
| `end.dateTime` | Work session end (duration = end - start) |
| `attendees[].email` | Identify external attendees = likely client |
| `description` | May contain project context or notes |
| `recurrence` | Identifies recurring meetings (weigh differently) |
| `status` | Only include `confirmed` events (exclude cancelled) |

---

## 3. Calendar Inference Algorithm Design

### Step 1: Event Classification

When GigAnalytics pulls calendar events, classify each:

```
INCOME_RELATED if:
  - External attendee email domain matches known client domain
  - Event title contains client name (fuzzy match against income stream names)
  - Event title matches patterns: "call", "meeting", "standup", "check-in", 
    "project", "sprint", "review", "consultation", "session"

OVERHEAD if:
  - Solo event (no external attendees) + title matches: "admin", "proposal", 
    "invoice", "email", "planning"
  - Internal meeting with team (no client)

PERSONAL (exclude) if:
  - Personal calendar (separate calendar ID)
  - Title matches: "dentist", "gym", "lunch", "vacation", "birthday"
  - All-day events (unless specifically work-related)
```

### Step 2: Client Name Extraction

Extract likely client from event summary using pattern matching:
```
"Call with Acme Corp" → client: "Acme Corp"
"Acme Corp — project review" → client: "Acme Corp"
"NEFF brand standup" → client: "NEFF brand"
"client meeting" → client: unknown (ask user)
```

Cross-reference extracted client name against known income streams (from Stripe/PayPal/Upwork data):
- Exact match → auto-assign to stream
- Fuzzy match (>80% similarity) → suggest to user
- No match → ask user to assign

### Step 3: Duration Calculation

```javascript
duration_minutes = (event.end.dateTime - event.start.dateTime) / 60000

// Adjust for very long events (likely not all work)
if duration_minutes > 180:
  suggest_trim = true
  prompt_user = "This event is 3+ hours. Was all of it client work?"

// All-day events: skip (too ambiguous)
if event.start.date (no time component): skip
```

### Step 4: Conflict Resolution

When calendar event overlaps with Toggl time entry for same period:
- **Toggl wins** (more specific, timer-based)
- Log calendar event as "confirmed by timer" in audit trail
- Don't double-count

When calendar event exists but no Toggl entry:
- Propose as unconfirmed time entry
- User reviews and confirms/rejects with one tap

---

## 4. Real-World Calendar Usage Patterns by Persona

### Service Freelancer (Persona 2) Calendar Patterns

**What's on their calendar:**
```
✓ Client calls (100% of scheduled meetings)
✓ Project kickoffs, status reviews, handoffs
✓ Co-working / focus blocks (50% of freelancers)
✓ Proposal deadlines (as reminders)
✓ Invoice reminders
✗ Actual coding / design work (usually not calendared)
✗ Email / Slack communication (async, not calendared)
```

**Calendar inference coverage estimate:** 30-50% of total client hours are inferrable from calendar. The rest (focused work, async communication) requires Toggl or manual entry.

**Community quote pattern (from r/freelance):**
> "I have every client call on my Google Calendar. The actual work I just do — I never block it. If I had to guess how many hours I worked on Acme Corp last month, I could count calls (6 hours) but the design work in between is a mystery."

### Creator-Seller (Persona 1) Calendar Patterns

**What's on their calendar:**
```
✓ Scheduled launch dates ("Etsy sale ends Sunday")
✓ Photo shoots (for new product listings)
✓ Packing/shipping days
✗ Making/crafting time (organic, unscheduled)
✗ Social media posting (sporadic)
✗ Customer service responses (async)
```

**Calendar inference coverage estimate:** 15-20% of work hours. Most creator work is unscheduled.

**Better input for this persona:** Timer widget or retroactive "I made things for 2 hours today" quick entry.

### Platform Gig Worker (Persona 3) Calendar Patterns

**What's on their calendar:**
```
✓ TaskRabbit pre-booked appointments (clients set time)
✓ Rover boarding check-ins (scheduled by booking)
✗ DoorDash / Uber (fully reactive, no advance scheduling)
✗ Ad hoc neighborhood cash jobs
```

**Calendar inference coverage estimate:** For task-based gig workers (TaskRabbit, Rover), calendar coverage is high — bookings are scheduled. For delivery gig workers (DoorDash, Uber), zero — all reactive.

**GigAnalytics approach for this persona:** TaskRabbit/Rover bookings from calendar → auto-create time+income entries. DoorDash/Uber → manual or bank-deposit-based.

---

## 5. Outlook Calendar and Apple Calendar

### Outlook/Microsoft Calendar API
- **Graph API endpoint:** `GET https://graph.microsoft.com/v1.0/me/events`
- Auth: Microsoft Identity OAuth 2.0, scope `Calendars.Read`
- Event schema similar to Google Calendar
- Key difference: `isAllDay` boolean field vs. Google's `date` vs. `dateTime` distinction
- Attendees include `emailAddress.address` and `emailAddress.name`

### Apple Calendar
- No direct API for third-party apps without device-side integration
- CalDAV protocol accessible but complex; requires user to expose CalDAV URL
- **Practical approach:** User exports `.ics` file from Apple Calendar → GigAnalytics parses iCal format
- iCal format fields: `DTSTART`, `DTEND`, `SUMMARY`, `ATTENDEE`, `DESCRIPTION`, `STATUS`

### iCal Format (Universal)
Most calendar apps can export to `.ics` (iCalendar) format. GigAnalytics should support iCal import as universal fallback:

```
BEGIN:VEVENT
DTSTART:20240315T140000Z
DTEND:20240315T150000Z
SUMMARY:Client call — Acme Corp
DESCRIPTION:Q3 project review
ATTENDEE;CN=Client Name:mailto:client@acmecorp.com
STATUS:CONFIRMED
END:VEVENT
```

---

## 6. Calendar Habits and Anti-Patterns to Design Around

### Anti-Pattern 1: Long Recurring Events
Many freelancers have **weekly standing meetings** as recurring calendar events. These are real work time — but the event title often becomes generic over time ("Team sync", "Weekly call").

**Design response:** For recurring events, prompt once to associate with client/stream, then auto-apply to all future instances.

### Anti-Pattern 2: Meeting-Longer-Than-Booked
A 1-hour "client call" turns into 90 minutes. Calendar shows 1 hour; actual work was 90 minutes.

**Design response:** When calendar event ends and GigAnalytics proposes a time entry, show: "Your Acme Corp call ended. Was it [1 hr as scheduled] or [enter actual time]?" with one-tap override.

### Anti-Pattern 3: Personal and Work Calendars Mixed
Many freelancers use a single Google Calendar for everything. "Dentist appointment" and "Client call" are in the same calendar.

**Design response:** Let users exclude specific calendars from inference. Show a calendar selector during onboarding: "Which of your calendars contain work events?" Apply inference only to selected calendars.

### Anti-Pattern 4: Event-Free Deep Work
The most productive work sessions — 3-hour focused design or coding blocks — are often not on the calendar at all.

**Design response:** Calendar inference covers meetings. Offer a quick "I worked for [1hr] [2hr] [3hr] [custom]" widget for non-meeting work. Timer option for real-time tracking. Calendar is one input method, not the only one.

---

## 7. GigAnalytics Calendar Integration UX Flow

```
Onboarding Step 4: "Connect your calendar for automatic time tracking"

[Connect Google Calendar] [Connect Outlook] [Use Toggl instead] [Skip]

↓ Google Calendar connected

"Select calendars to include:"
[✓] Work (primary) — 847 events in last 90 days
[✓] Clients — 124 events
[  ] Personal — 312 events (excluded)

↓ "We found 43 potential work events in the last 30 days"

Review screen:
[Acme Corp weekly call] 1hr × 4 weeks = 4 hrs → [Assign to stream: Acme Corp ▼]
[NEFF project review] 1.5 hrs → [Assign to stream: NEFF ▼]
[Admin/invoice time] 0.5 hrs × 8 = 4 hrs → [Overhead]

[Confirm all] [Review individually]

↓ Confirmed

"We've created 31 time entries from your calendar.
Your effective hourly rate for Acme Corp is now calculable: $118/hr"
```

---

*Sources: Google Calendar API documentation (developers.google.com/calendar/api), Microsoft Graph Calendar API, iCalendar RFC 5545, Toggl calendar integration docs, community workflow patterns — April 2026*
