import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  classifyCloudTrailEvent,
  parseSnsNotification,
  parseEventBridgeEvent,
  HIGH_PRIORITY_CLOUDTRAIL_EVENTS,
  type CloudTrailEvent,
} from "@/lib/cloudtrail-events";

export const dynamic = "force-dynamic";

// Match org by account ID stored in connector config
async function getOrgsForAccount(accountId?: string): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("org_id, config, crr_orgs!inner(id, name, slug, status)")
    .in("type", ["aws_cloudtrail", "aws_eventbridge"])
    .eq("status", "active");

  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.filter((row: any) => {
    if (!row.crr_orgs || row.crr_orgs.status !== "active") return false;
    if (accountId && row.config?.aws_account_id) {
      return row.config.aws_account_id === accountId;
    }
    return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }).map((row: any) => row.crr_orgs);
}

async function processCloudTrailRecord(
  record: CloudTrailEvent,
  orgId: string,
  runAt: string
): Promise<boolean> {
  const risk = classifyCloudTrailEvent(record);
  if (!risk.should_alert && !HIGH_PRIORITY_CLOUDTRAIL_EVENTS.has(record.eventName)) {
    return false;
  }

  // Store raw event
  await supabaseAdmin.from("crr_cloudtrail_events").insert({
    org_id: orgId,
    event_name: record.eventName,
    event_source: record.eventSource,
    event_time: record.eventTime ?? runAt,
    aws_region: record.awsRegion,
    user_identity: record.userIdentity ?? null,
    request_parameters: record.requestParameters ?? null,
    response_elements: record.responseElements ?? null,
    risk_level: risk.risk_level,
    risk_category: risk.risk_category,
    title: risk.title,
    summary: risk.summary,
    raw_event: record as unknown as Record<string, unknown>,
    processed: true,
    alert_generated: risk.should_alert,
  });

  if (!risk.should_alert) return false;

  // Check for dedup (same event from same org in last 24h)
  const { data: existing } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id")
    .eq("org_id", orgId)
    .eq("title", risk.title)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .limit(1);

  if (existing?.length) return false;  // deduped

  // Create alert
  await supabaseAdmin.from("crr_org_alerts").insert({
    org_id: orgId,
    vendor_slug: "aws",
    risk_level: risk.risk_level,
    risk_category: risk.risk_category,
    severity: risk.risk_level === "high" ? "critical" : "high",
    title: risk.title,
    summary: risk.summary,
    source_url: `https://console.aws.amazon.com/cloudtrail/home`,
    created_at: record.eventTime ?? runAt,
  });

  // Log webhook event
  await supabaseAdmin.from("crr_webhook_events").insert({
    source: "cloudtrail",
    event_type: record.eventName,
    risk_level: risk.risk_level,
    risk_category: risk.risk_category,
    payload: { eventName: record.eventName, eventSource: record.eventSource, risk },
  });

  return true;
}

export async function POST(req: NextRequest) {
  const runAt = new Date().toISOString();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // Verify HMAC if configured
  const expectedToken = process.env.CLOUDTRAIL_WEBHOOK_TOKEN;
  if (expectedToken) {
    const providedToken = req.headers.get("x-cloudtrail-token") ||
      req.nextUrl.searchParams.get("token");
    if (providedToken !== expectedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  }

  let records: CloudTrailEvent[] = [];
  let accountId: string | undefined;

  // Detect format: SNS notification, EventBridge, or raw CloudTrail array
  const snsType = (body as { Type?: string }).Type;
  if (snsType === "SubscriptionConfirmation") {
    // Auto-confirm SNS subscription by fetching SubscribeURL
    const subscribeUrl = (body as { SubscribeURL?: string }).SubscribeURL;
    if (subscribeUrl) {
      await fetch(subscribeUrl).catch(() => null);
    }
    return NextResponse.json({ confirmed: true });
  }

  if (snsType === "Notification") {
    const parsed = parseSnsNotification(body);
    records = parsed.records;
  } else if ((body as { source?: string }).source === "aws.cloudtrail") {
    // EventBridge format
    const evt = parseEventBridgeEvent(body);
    if (evt) {
      records = [evt];
      accountId = (body as { account?: string }).account;
    }
  } else if (Array.isArray((body as { Records?: unknown[] }).Records)) {
    // Raw CloudTrail records array
    records = (body as { Records: CloudTrailEvent[] }).Records;
    accountId = records[0]?.userIdentity?.accountId;
  } else if ((body as CloudTrailEvent).eventName) {
    // Single event
    records = [body as CloudTrailEvent];
    accountId = (body as CloudTrailEvent).userIdentity?.accountId;
  }

  if (!records.length) {
    return NextResponse.json({ received: true, events_processed: 0 });
  }

  const orgs = await getOrgsForAccount(accountId);
  if (!orgs.length) {
    // Still store the event even without a matched org (global record)
    await supabaseAdmin.from("crr_detector_runs").insert({
      detector_type: "cloudtrail_webhook",
      new_diffs: 0,
      orgs_alerted: 0,
      metadata: { records_received: records.length, no_org_match: true, account_id: accountId },
    });
    return NextResponse.json({
      received: true,
      events_processed: records.length,
      orgs_matched: 0,
      note: "No active AWS connector matched this account ID",
    });
  }

  let alertsCreated = 0;
  for (const record of records) {
    for (const org of orgs) {
      const created = await processCloudTrailRecord(record, org.id, runAt);
      if (created) alertsCreated++;
    }
  }

  await supabaseAdmin.from("crr_detector_runs").insert({
    detector_type: "cloudtrail_webhook",
    new_diffs: 0,
    orgs_alerted: alertsCreated,
    metadata: {
      records_received: records.length,
      alerts_created: alertsCreated,
      orgs_matched: orgs.length,
      account_id: accountId,
      event_names: [...new Set(records.map(r => r.eventName))],
    },
  });

  return NextResponse.json({
    received: true,
    events_processed: records.length,
    orgs_matched: orgs.length,
    alerts_created: alertsCreated,
  });
}

export async function GET() {
  const base = "https://change-risk-radar.vercel.app";
  return NextResponse.json({
    endpoint: `${base}/api/webhooks/cloudtrail`,
    description: "AWS CloudTrail ingest — supports SNS notifications and EventBridge HTTP destinations",
    setup: {
      option_a_sns: {
        description: "CloudTrail → SNS topic → this endpoint",
        steps: [
          "1. Enable CloudTrail in AWS Console → Trails → Create trail",
          "2. Create an SNS topic in the same region",
          "3. Subscribe: SNS → Subscriptions → Create → HTTPS → paste endpoint URL",
          "4. SNS auto-confirms the subscription (endpoint handles SubscriptionConfirmation)",
          "5. In CloudTrail: select SNS topic for notifications",
          `6. Endpoint: ${base}/api/webhooks/cloudtrail`,
          "7. Optional: set CLOUDTRAIL_WEBHOOK_TOKEN env var and append ?token=YOUR_TOKEN",
        ],
      },
      option_b_eventbridge: {
        description: "CloudTrail → EventBridge → HTTP API destination",
        steps: [
          "1. AWS Console → EventBridge → Rules → Create rule",
          "2. Event pattern: source: aws.cloudtrail + detail.eventName: [list of events]",
          "3. Target: HTTP destination → POST to this endpoint",
          `4. API destination URL: ${base}/api/webhooks/cloudtrail`,
          "5. Set Connection authorization header: x-cloudtrail-token: YOUR_TOKEN",
        ],
        sample_event_pattern: {
          source: ["aws.cloudtrail"],
          detail: {
            eventName: [
              "CreateUser", "AttachRolePolicy", "PutBucketPolicy",
              "AuthorizeSecurityGroupIngress", "StopLogging", "ScheduleKeyDeletion",
            ],
          },
        },
      },
      connector_config: {
        type: "aws_cloudtrail",
        config: {
          aws_account_id: "123456789012",
          aws_region: "us-east-1",
          sns_topic_arn: "arn:aws:sns:us-east-1:...",
          event_filters: ["IAM", "S3", "KMS", "VPC"],
        },
      },
    },
    monitored_event_categories: {
      IAM: ["CreateUser", "AttachRolePolicy", "PutUserPolicy", "DeactivateMFADevice", "CreateAccessKey"],
      S3: ["PutBucketPolicy", "DeleteBucketPolicy", "PutBucketAcl", "PutBucketPublicAccessBlock"],
      Network: ["AuthorizeSecurityGroupIngress", "ModifyVpcEndpoint", "CreateVpcPeeringConnection"],
      KMS: ["DisableKey", "ScheduleKeyDeletion", "PutKeyPolicy"],
      Audit: ["StopLogging", "DeleteTrail", "StopConfigurationRecorder"],
      Billing: ["ModifyBudget", "DeleteBudget", "UpdateBillingPreferences"],
      RDS: ["DeleteDBInstance", "DeleteDBCluster"],
    },
    env_optional: [
      { key: "CLOUDTRAIL_WEBHOOK_TOKEN", description: "Token for webhook auth (append as ?token= or x-cloudtrail-token header)" },
    ],
  });
}
