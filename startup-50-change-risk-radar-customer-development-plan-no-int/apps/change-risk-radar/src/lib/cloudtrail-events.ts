/**
 * AWS CloudTrail Event Classifier
 *
 * Supports two CloudTrail delivery methods:
 * 1. SNS notification (CloudTrail → SNS topic → our endpoint)
 * 2. EventBridge rule (CloudTrail → EventBridge Pipes → HTTP destination)
 *
 * Covers 35+ high-signal event types across IAM, S3, EC2, VPC, KMS, RDS,
 * Lambda, CloudFormation, Config, GuardDuty, and billing.
 */

export interface CloudTrailEvent {
  eventName: string;
  eventSource: string;
  eventTime?: string;
  awsRegion?: string;
  userIdentity?: {
    type?: string;
    principalId?: string;
    arn?: string;
    accountId?: string;
    userName?: string;
  };
  requestParameters?: Record<string, unknown>;
  responseElements?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  sourceIPAddress?: string;
}

export interface CloudTrailRisk {
  risk_level: "high" | "medium" | "low";
  risk_category: "security" | "legal" | "pricing" | "operational" | "vendor_risk";
  title: string;
  summary: string;
  should_alert: boolean;
}

// ── IAM events ────────────────────────────────────────────────────────────────

const IAM_HIGH_RISK = new Set([
  "CreateUser",
  "CreateAccessKey",
  "AttachUserPolicy",
  "AttachRolePolicy",
  "AttachGroupPolicy",
  "PutUserPolicy",
  "PutRolePolicy",
  "CreateRole",
  "AssumeRoleWithWebIdentity",
  "UpdateAssumeRolePolicy",
  "DeleteUserPolicy",
  "DetachRolePolicy",
  "CreateLoginProfile",
  "UpdateLoginProfile",
  "DeactivateMFADevice",
  "DeleteVirtualMFADevice",
  "EnableMFADevice",
]);

const IAM_MEDIUM_RISK = new Set([
  "CreateGroup",
  "AddUserToGroup",
  "RemoveUserFromGroup",
  "DeleteUser",
  "DeleteAccessKey",
  "UpdateAccessKey",
  "CreateServiceLinkedRole",
  "TagUser",
  "UntagUser",
]);

// ── S3 / Storage events ───────────────────────────────────────────────────────

const S3_HIGH_RISK = new Set([
  "PutBucketPolicy",
  "DeleteBucketPolicy",
  "PutBucketAcl",
  "PutBucketPublicAccessBlock",
  "DeleteBucketEncryption",
  "PutBucketReplication",
  "DeleteBucket",
]);

const S3_MEDIUM_RISK = new Set([
  "CreateBucket",
  "PutBucketVersioning",
  "PutBucketLogging",
  "PutBucketCORS",
  "PutBucketLifecycle",
]);

// ── Network / VPC events ──────────────────────────────────────────────────────

const VPC_HIGH_RISK = new Set([
  "AuthorizeSecurityGroupIngress",
  "AuthorizeSecurityGroupEgress",
  "RevokeSecurityGroupIngress",
  "CreateSecurityGroup",
  "DeleteSecurityGroup",
  "ModifyVpcEndpoint",
  "CreateVpcPeeringConnection",
  "AcceptVpcPeeringConnection",
]);

const VPC_MEDIUM_RISK = new Set([
  "CreateVpc",
  "DeleteVpc",
  "ModifySubnetAttribute",
  "CreateInternetGateway",
  "AttachInternetGateway",
]);

// ── KMS / Encryption ──────────────────────────────────────────────────────────

const KMS_HIGH_RISK = new Set([
  "DisableKey",
  "ScheduleKeyDeletion",
  "DeleteAlias",
  "PutKeyPolicy",
  "CreateGrant",
  "RetireGrant",
  "RevokeGrant",
]);

// ── EC2 / Compute ─────────────────────────────────────────────────────────────

const EC2_MEDIUM_RISK = new Set([
  "StopInstances",
  "TerminateInstances",
  "ModifyInstanceAttribute",
  "CreateImage",
  "DeregisterImage",
]);

// ── Billing / Cost ────────────────────────────────────────────────────────────

const BILLING_HIGH_RISK = new Set([
  "ModifyBudget",
  "DeleteBudget",
  "PutBillingAlarm",
  "UpdateBillingPreferences",
  "LinkBillingAccount",
]);

// ── Compliance / Audit ────────────────────────────────────────────────────────

const AUDIT_HIGH_RISK = new Set([
  "StopLogging",
  "DeleteTrail",
  "UpdateTrail",
  "PutConfigRule",
  "DeleteConfigRule",
  "StopConfigurationRecorder",
  "DeleteDeliveryChannel",
]);

// ── Lambda / Serverless ───────────────────────────────────────────────────────

const LAMBDA_MEDIUM_RISK = new Set([
  "AddPermission",
  "RemovePermission",
  "PutFunctionConcurrency",
  "DeleteFunctionConcurrency",
  "UpdateFunctionConfiguration",
]);

// ── RDS / Database ────────────────────────────────────────────────────────────

const RDS_HIGH_RISK = new Set([
  "DeleteDBInstance",
  "DeleteDBCluster",
  "RestoreDBInstanceFromDBSnapshot",
  "ModifyDBInstance",
]);

// ── Main classifier ───────────────────────────────────────────────────────────

export function classifyCloudTrailEvent(event: CloudTrailEvent): CloudTrailRisk {
  const { eventName, eventSource, errorCode } = event;
  const source = (eventSource ?? "").split(".")[0].toLowerCase();

  // Skip failed events (errorCode present) — these didn't actually happen
  if (errorCode && errorCode !== "None") {
    return {
      risk_level: "low",
      risk_category: "operational",
      title: `${eventName} (failed)`,
      summary: `CloudTrail recorded a failed ${eventName} call — no action taken. Error: ${errorCode}`,
      should_alert: false,
    };
  }

  // IAM
  if (source === "iam") {
    if (IAM_HIGH_RISK.has(eventName)) {
      const actor = event.userIdentity?.userName ?? event.userIdentity?.arn ?? "unknown principal";
      const isDestructive = eventName.startsWith("Delete") || eventName.startsWith("Deactivate");
      const isPrivesc = ["AttachUserPolicy", "AttachRolePolicy", "PutUserPolicy", "PutRolePolicy", "CreateRole"].includes(eventName);
      return {
        risk_level: "high",
        risk_category: "security",
        title: `AWS IAM: ${eventName}`,
        summary: isPrivesc
          ? `Privilege escalation risk: ${eventName} performed by ${actor}. Review policy attachment for least-privilege compliance.`
          : isDestructive
          ? `Destructive IAM action: ${eventName} performed by ${actor}. Verify this was authorized.`
          : `High-risk IAM change: ${eventName} by ${actor}. Validate access change.`,
        should_alert: true,
      };
    }
    if (IAM_MEDIUM_RISK.has(eventName)) {
      return {
        risk_level: "medium",
        risk_category: "security",
        title: `AWS IAM: ${eventName}`,
        summary: `IAM user/group modification: ${eventName}. Review access change.`,
        should_alert: true,
      };
    }
  }

  // S3
  if (source === "s3") {
    if (S3_HIGH_RISK.has(eventName)) {
      const bucket = (event.requestParameters?.bucketName ?? "unknown bucket") as string;
      const isPublic = eventName.includes("PublicAccess") || eventName.includes("Acl") || eventName.includes("Policy");
      return {
        risk_level: "high",
        risk_category: "security",
        title: `AWS S3: ${eventName} on ${bucket}`,
        summary: isPublic
          ? `Potential data exposure: ${eventName} may have changed public access settings on ${bucket}. Verify bucket is not unintentionally public.`
          : `High-risk S3 change: ${eventName} on ${bucket}. Verify data protection posture.`,
        should_alert: true,
      };
    }
    if (S3_MEDIUM_RISK.has(eventName)) {
      const bucket = (event.requestParameters?.bucketName ?? "unknown bucket") as string;
      return {
        risk_level: "medium",
        risk_category: "security",
        title: `AWS S3: ${eventName} on ${bucket}`,
        summary: `S3 bucket configuration changed: ${eventName} on ${bucket}.`,
        should_alert: true,
      };
    }
  }

  // VPC / EC2 networking
  if (source === "ec2") {
    if (VPC_HIGH_RISK.has(eventName)) {
      return {
        risk_level: "high",
        risk_category: "security",
        title: `AWS Network: ${eventName}`,
        summary: `Security group or VPC change: ${eventName}. Verify firewall rules are not overly permissive.`,
        should_alert: true,
      };
    }
    if (VPC_MEDIUM_RISK.has(eventName)) {
      return {
        risk_level: "medium",
        risk_category: "operational",
        title: `AWS VPC: ${eventName}`,
        summary: `Network topology change: ${eventName}. Review for unintended connectivity.`,
        should_alert: true,
      };
    }
    if (EC2_MEDIUM_RISK.has(eventName)) {
      return {
        risk_level: "medium",
        risk_category: "operational",
        title: `AWS EC2: ${eventName}`,
        summary: `Compute resource change: ${eventName}. Verify this was intentional.`,
        should_alert: false,  // noisy — only alert if configured
      };
    }
  }

  // KMS
  if (source === "kms") {
    if (KMS_HIGH_RISK.has(eventName)) {
      const keyId = (event.requestParameters?.keyId ?? "unknown key") as string;
      return {
        risk_level: "high",
        risk_category: "security",
        title: `AWS KMS: ${eventName}`,
        summary: `Encryption key change: ${eventName} on ${keyId}. Disabling or deleting KMS keys may cause data loss or access failures.`,
        should_alert: true,
      };
    }
  }

  // CloudTrail / Config / Audit
  if (source === "cloudtrail" || source === "config") {
    if (AUDIT_HIGH_RISK.has(eventName)) {
      return {
        risk_level: "high",
        risk_category: "security",
        title: `AWS Audit: ${eventName}`,
        summary: `Audit trail change: ${eventName}. Disabling logging or config rules reduces compliance visibility.`,
        should_alert: true,
      };
    }
  }

  // Billing
  if (source === "budgets" || source === "billing" || source === "ce") {
    if (BILLING_HIGH_RISK.has(eventName)) {
      return {
        risk_level: "high",
        risk_category: "pricing",
        title: `AWS Billing: ${eventName}`,
        summary: `AWS billing configuration changed: ${eventName}. Review budget alerts and cost controls.`,
        should_alert: true,
      };
    }
  }

  // Lambda
  if (source === "lambda") {
    if (LAMBDA_MEDIUM_RISK.has(eventName)) {
      const funcName = (event.requestParameters?.functionName ?? "unknown function") as string;
      return {
        risk_level: "medium",
        risk_category: "operational",
        title: `AWS Lambda: ${eventName} on ${funcName}`,
        summary: `Lambda permission or config change: ${eventName} on ${funcName}.`,
        should_alert: false,
      };
    }
  }

  // RDS
  if (source === "rds") {
    if (RDS_HIGH_RISK.has(eventName)) {
      return {
        risk_level: "high",
        risk_category: "operational",
        title: `AWS RDS: ${eventName}`,
        summary: `Critical database operation: ${eventName}. Verify data backup and access continuity.`,
        should_alert: true,
      };
    }
  }

  // Default: low risk, don't alert
  return {
    risk_level: "low",
    risk_category: "operational",
    title: `AWS ${source.toUpperCase()}: ${eventName}`,
    summary: `CloudTrail recorded ${eventName} from ${source}. No immediate risk detected.`,
    should_alert: false,
  };
}

// ── High-priority event set (always alert) ────────────────────────────────────

export const HIGH_PRIORITY_CLOUDTRAIL_EVENTS = new Set([
  ...IAM_HIGH_RISK,
  ...S3_HIGH_RISK,
  ...VPC_HIGH_RISK,
  ...KMS_HIGH_RISK,
  ...AUDIT_HIGH_RISK,
  ...BILLING_HIGH_RISK,
  ...RDS_HIGH_RISK,
]);

// ── SNS notification parser ───────────────────────────────────────────────────

export interface SnsNotification {
  Type: string;
  MessageId?: string;
  TopicArn?: string;
  Subject?: string;
  Message: string;
  SubscribeURL?: string;
  Token?: string;
}

export function parseSnsNotification(body: unknown): {
  type: "subscription_confirmation" | "notification" | "unsubscribe";
  records: CloudTrailEvent[];
  subscribeUrl?: string;
} {
  const sns = body as SnsNotification;
  if (sns.Type === "SubscriptionConfirmation") {
    return { type: "subscription_confirmation", records: [], subscribeUrl: sns.SubscribeURL };
  }
  if (sns.Type === "UnsubscribeConfirmation") {
    return { type: "unsubscribe", records: [] };
  }

  // Parse the CloudTrail notification message
  try {
    const msg = JSON.parse(sns.Message ?? "{}");
    const records: CloudTrailEvent[] = msg.Records ?? msg.detail?.events ?? [];
    return { type: "notification", records };
  } catch {
    return { type: "notification", records: [] };
  }
}

// ── EventBridge event parser ──────────────────────────────────────────────────

export function parseEventBridgeEvent(body: unknown): CloudTrailEvent | null {
  const evt = body as Record<string, unknown>;
  // EventBridge wraps CloudTrail: { source: "aws.cloudtrail", detail: { ... } }
  const detail = (evt.detail ?? evt) as Record<string, unknown>;
  if (!detail.eventName) return null;
  return detail as unknown as CloudTrailEvent;
}
