# Slack Notifications for Change Risk Radar

Get real-time alerts in your Slack channel when a vendor changes pricing, terms, API, or security posture.

---

## How it works

Change Risk Radar monitors your connected vendors (Stripe, AWS, Google Workspace, Shopify, etc.) and fires a Slack message the moment a risk-level change is detected. Messages are rich Block Kit cards with severity, category, vendor name, and a direct link to the alert detail.

---

## Step 1 — Create a Slack Incoming Webhook

1. In Slack, go to **Apps** → search **Incoming Webhooks** → click **Add to Slack**
2. Choose a channel (e.g., `#risk-alerts`)
3. Click **Add Incoming Webhooks Integration**
4. Copy the **Webhook URL** — it looks like:
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
   ```

> **Tip:** Create a dedicated `#vendor-risk-alerts` channel to keep signal clean.

---

## Step 2 — Add the webhook in Change Risk Radar

1. Navigate to your dashboard: `https://change-risk-radar.vercel.app/dashboard/<your-org>/notifications?token=<your-token>`
2. Click **+ Add channel**
3. Select **Slack**
4. Paste your Webhook URL in the **Webhook URL** field
5. (Optional) Set a minimum severity filter — alerts below this level will be suppressed
6. Click **Save** — a test message is sent to Slack automatically

If the test message appears in your channel, you're live. ✅

---

## Step 3 — Test & verify

After saving, a test message like this is posted to your Slack channel:

> 🟠 **[Test] Change Risk Radar — slack_webhook notification test**
> This is a test notification from Change Risk Radar for Acme Corp. Your slack_webhook channel is configured correctly and will receive real alerts when risk changes are detected.

You can also send another test at any time by clicking the **Test** button next to the channel in the Notifications settings page.

---

## Managing channels

| Action | How |
|--------|-----|
| Toggle on/off | Use the toggle switch next to the channel |
| Delete | Click the trash icon |
| Re-test | Click the ▶ Test button |
| See delivery history | Visit the channel row — `sent` / `failed` counts are shown |

---

## API reference

All notification endpoints use the magic-token auth (`?token=<org_token>`).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notification-endpoints` | `GET` | List channels (masked webhook URLs) |
| `/api/notification-endpoints` | `POST` | Create a Slack webhook channel |
| `/api/notification-endpoints/:id` | `PATCH` | Toggle or rename a channel |
| `/api/notification-endpoints/:id` | `DELETE` | Remove a channel |
| `/api/notifications/channels` | `GET/POST/PATCH/DELETE` | Full channels CRUD |
| `/api/notifications/test` | `POST` | Send a test message to a channel |
| `/api/connectors/slack/setup` | `POST` | One-step Slack setup with test-send |

---

## Database tables

| Table | Purpose |
|-------|---------|
| `crr_notification_channels` | Stores webhook configs (type, label, config JSON, is_active) |
| `crr_notification_log` | Delivery receipts — status, latency, error message |
| `crr_alert_dispatches` | Per-alert per-channel delivery tracking with idempotency |

---

## Migration route

If tables are missing in a new environment, hit the migration endpoint:

```
GET https://change-risk-radar.vercel.app/api/admin/migrate?token=<MIGRATION_TOKEN>
```

- Verifies all notification tables exist
- Returns `200 OK` with a results array
- Set `MIGRATION_TOKEN` in Vercel env vars (project settings → Environment Variables)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Test message not arriving | Check the webhook URL starts with `https://hooks.slack.com/services/` |
| "Slack webhook invalid" error | Regenerate the webhook in Slack Apps settings |
| No alerts (but test works) | Check minimum severity filter — try setting it to `low` |
| Banner keeps showing | Add a webhook endpoint; banner auto-hides once a channel exists |

---

## Security notes

- Webhook URLs are stored **server-side only** and masked in API responses (last 8 chars shown)
- The full URL is never sent to the browser after save
- The migration route requires a `MIGRATION_TOKEN` env var — never expose it publicly
