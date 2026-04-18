// ============================================================
// Course domain types
// ============================================================

export type PricingModel = 'free' | 'one_time' | 'subscription';
export type CourseTier = 'free' | 'creator' | 'marketplace';

export interface Course {
  id: string;
  creatorId: string;
  slug: string;
  title: string;
  description: string | null;
  priceCents: number;
  currency: string;
  published: boolean;
  repoUrl: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  version: string;
  thumbnailUrl: string | null;
  tags: string[];
  passThreshold: number;
  affiliatesEnabled: boolean;
  affiliateCommissionPct: number;
  affiliateCookieDays: number;
  sandboxesEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  description: string | null;
  contentMd: string;
  orderIndex: number;
  isPreview: boolean;
  estimatedMinutes: number | null;
  createdAt: string;
  updatedAt: string;
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
