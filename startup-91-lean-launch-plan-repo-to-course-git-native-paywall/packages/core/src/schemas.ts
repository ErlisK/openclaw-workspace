import { z } from 'zod';

/** Zod schema for course.config.yaml */
export const CourseConfigSchema = z.object({
  course: z.object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    description: z.string(),
    author: z.string(),
    email: z.string().email(),
    version: z.string().default('1.0.0'),
    language: z.string().default('en'),
    tags: z.array(z.string()).default([]),
  }),
  pricing: z.object({
    model: z.enum(['free', 'one_time', 'subscription']),
    amountCents: z.number().int().min(0).default(0),
    currency: z.string().length(3).default('usd'),
    stripePriceId: z.string().optional(),
  }),
  previewLessons: z.array(z.string()).default([]),
  affiliates: z.object({
    enabled: z.boolean().default(false),
    defaultCommissionPct: z.number().int().min(0).max(100).default(30),
    cookieDays: z.number().int().min(1).default(30),
  }).default({}),
  lessonsDir: z.string().default('./lessons'),
  lessonsOrder: z.array(z.string()).default([]),
  sandboxes: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['codesandbox', 'stackblitz', 'codepen']).default('codesandbox'),
  }).default({}),
  certificate: z.object({
    enabled: z.boolean().default(false),
    template: z.string().default('default'),
    passThreshold: z.number().int().min(0).max(100).default(70),
  }).default({}),
});

export type CourseConfig = z.infer<typeof CourseConfigSchema>;

/** Zod schema for lesson YAML frontmatter */
export const LessonFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isPreview: z.boolean().default(false),
  estimatedMinutes: z.number().int().min(1).optional(),
  quiz: z.array(z.object({
    question: z.string().min(1),
    type: z.enum(['multiple_choice', 'true_false', 'short_answer']).default('multiple_choice'),
    options: z.array(z.string()).optional(),
    correct: z.union([z.number().int().min(0), z.boolean()]),
    explanation: z.string().optional(),
  })).default([]),
});

export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;
