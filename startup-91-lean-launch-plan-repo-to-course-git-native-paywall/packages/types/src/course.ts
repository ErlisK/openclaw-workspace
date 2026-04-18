// ============================================================
// Course domain types (v2 — aligned with schema.sql v2)
// ============================================================

export type PricingModel = 'free' | 'one_time' | 'subscription';
export type SaasTier = 'free' | 'creator' | 'marketplace';

export interface Creator {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  twitterHandle: string | null;
  githubHandle: string | null;
  stripeCustomerId: string | null;
  stripeConnectAccountId: string | null;
  stripeConnectOnboarded: boolean;
  saasTier: SaasTier;
  saasSubscriptionId: string | null;
  saasExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  creatorId: string;
  slug: string;
  title: string;
  description: string | null;
  shortDesc: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  priceCents: number;
  currency: string;
  pricingModel: PricingModel;
  stripeProductId: string | null;
  stripePriceId: string | null;
  published: boolean;
  publishedAt: string | null;
  passThreshold: number;
  certEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseVersion {
  id: string;
  courseId: string;
  version: string;
  changelog: string | null;
  lessonCount: number;
  isLatest: boolean;
  publishedAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  courseVersionId: string | null;
  slug: string;
  title: string;
  description: string | null;
  contentMd: string;
  orderIndex: number;
  isPreview: boolean;
  estimatedMinutes: number | null;
  hasQuiz: boolean;
  hasSandbox: boolean;
  sandboxUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RepoImportStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface RepoImport {
  id: string;
  creatorId: string;
  courseId: string | null;
  repoUrl: string;
  repoRef: string;
  status: RepoImportStatus;
  detectedLessons: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

/** Parsed from course.config.yaml */
export interface CourseConfig {
  course: {
    title: string;
    slug: string;
    description: string;
    author: string;
    email: string;
    version: string;
    language: string;
    tags: string[];
  };
  pricing: {
    model: PricingModel;
    amountCents: number;
    currency: string;
    stripePriceId?: string;
  };
  previewLessons: string[];
  affiliates: {
    enabled: boolean;
    defaultCommissionPct: number;
    cookieDays: number;
  };
  lessonsDir: string;
  lessonsOrder: string[];
  sandboxes: {
    enabled: boolean;
    provider: 'codesandbox' | 'stackblitz' | 'codepen';
  };
  certificate: {
    enabled: boolean;
    template: string;
    passThreshold: number;
  };
}
