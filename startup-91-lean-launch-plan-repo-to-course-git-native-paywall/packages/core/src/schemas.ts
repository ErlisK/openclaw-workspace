import { z } from 'zod';

// ============================================================
// Lesson Frontmatter Schema
// Matches: docs/course-format.md §1
// ============================================================

export const LessonAccessSchema = z.enum(['free', 'paid']);
export type LessonAccess = z.infer<typeof LessonAccessSchema>;

export const LessonFrontmatterSchema = z.object({
  /** Display title — shown in lesson viewer and table of contents */
  title: z.string().min(1, 'title is required'),

  /** URL-safe identifier, kebab-case, unique within the course */
  slug: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      'slug must be lowercase alphanumeric with hyphens (e.g. "my-lesson")'
    ),

  /** 1-based integer — controls lesson sequence */
  order: z.number().int().min(1),

  /**
   * Access gate:
   *   free → anyone (maps to is_preview = true in DB)
   *   paid → enrolled students only (maps to is_preview = false)
   */
  access: LessonAccessSchema,

  /** One or two sentence description — SEO meta + lesson list */
  description: z.string().optional(),

  /** Estimated completion time in minutes */
  estimated_minutes: z.number().int().min(1).optional(),

  /**
   * Embeddable code sandbox URL.
   * Supported: codesandbox.io, stackblitz.com, codepen.io
   * If access=paid, URL is never sent to unenrolled browsers.
   */
  sandbox_url: z.string().url().optional(),

  /**
   * Quiz identifier — references quizzes/{quiz_id}.yml
   * If omitted, no quiz is attached to this lesson.
   */
  quiz_id: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/).optional(),
});

export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;

// ============================================================
// Quiz Question Schemas
// Matches: docs/course-format.md §2
// ============================================================

/** Shared fields across all question types */
const QuestionBaseSchema = z.object({
  /** Question text / statement */
  prompt: z.string().min(1, 'prompt is required'),

  /** Point weight for scoring — default 1 */
  points: z.number().int().min(1).default(1),

  /** Shown to the student after they answer */
  explanation: z.string().optional(),
});

export const MultipleChoiceQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal('multiple_choice'),

  /** Answer options — min 2, max 6 */
  choices: z
    .array(z.string().min(1))
    .min(2, 'multiple_choice requires at least 2 choices')
    .max(6, 'multiple_choice supports at most 6 choices'),

  /** 0-based index of the correct choice */
  answer: z.number().int().min(0),
}).superRefine((data, ctx) => {
  if (data.answer >= data.choices.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['answer'],
      message: `answer index ${data.answer} is out of bounds (${data.choices.length} choices)`,
    });
  }
});

export const TrueFalseQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal('true_false'),
  answer: z.boolean(),
});

export const ShortAnswerQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal('short_answer'),
  answer: z.string().min(1, 'short_answer requires an expected answer string'),
});

export const QuizQuestionSchema = z.discriminatedUnion('type', [
  MultipleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
  ShortAnswerQuestionSchema,
]);

export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceQuestionSchema>;
export type TrueFalseQuestion = z.infer<typeof TrueFalseQuestionSchema>;
export type ShortAnswerQuestion = z.infer<typeof ShortAnswerQuestionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

// ============================================================
// Quiz File Schema
// Matches: quizzes/{quiz_id}.yml
// ============================================================

export const QuizFileSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/),
  title: z.string().min(1),
  pass_threshold: z.number().int().min(0).max(100).default(70),
  ai_generated: z.boolean().default(false),
  questions: z.array(QuizQuestionSchema).min(1, 'quiz must have at least one question'),
});

export type QuizFile = z.infer<typeof QuizFileSchema>;

// ============================================================
// Course Config Shared fields
// ============================================================

const CourseSharedFields = {
  /** Default pass threshold for all quizzes */
  pass_threshold: z.number().int().min(0).max(100).default(70),

  /** Relative path to the lessons directory */
  lessons_dir: z.string().default('./lessons'),

  /**
   * Explicit lesson order by slug.
   * If omitted, CLI sorts by filename prefix (NN-slug.md).
   */
  lessons_order: z.array(z.string()).default([]),

  affiliates: z
    .object({
      enabled: z.boolean().default(false),
      default_commission_pct: z.number().int().min(0).max(100).default(30),
      cookie_days: z.number().int().min(1).default(30),
    })
    .default({}),

  sandboxes: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(['codesandbox', 'stackblitz', 'codepen']).default('codesandbox'),
    })
    .default({}),

  certificate: z
    .object({
      enabled: z.boolean().default(false),
      template: z.string().default('default'),
    })
    .default({}),
};

// ============================================================
// course.yml — flat format (new, used by sample-course)
//   title, description, price_cents, currency, affiliate_pct, repo_url
// ============================================================

export const CourseYmlSchema = z
  .object({
    // Required identity
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/),
    description: z.string().default(''),
    author: z.string().default(''),
    email: z.string().email().optional(),
    version: z.string().default('1.0.0'),
    language: z.string().default('en'),
    tags: z.array(z.string()).default([]),

    /** Canonical repo URL for this course */
    repo_url: z.string().url().optional(),

    // Pricing (flat fields)
    price_cents: z.number().int().min(0).default(0),
    currency: z.string().length(3).default('usd'),
    stripe_price_id: z.string().optional(),

    // Affiliate (flat field — convenience alias for affiliates.default_commission_pct)
    affiliate_pct: z.number().int().min(0).max(100).default(30),

    ...CourseSharedFields,
  })
  .transform((data) => ({
    ...data,
    // Normalize: ensure affiliates block is consistent with top-level affiliate_pct
    affiliates: {
      ...data.affiliates,
      default_commission_pct: data.affiliate_pct,
    },
  }));

export type CourseYml = z.infer<typeof CourseYmlSchema>;

// ============================================================
// course.config.yaml — nested format (legacy)
// ============================================================

export const CourseConfigSchema = z.object({
  course: z.object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/),
    description: z.string().default(''),
    author: z.string().default(''),
    email: z.string().email().optional(),
    version: z.string().default('1.0.0'),
    language: z.string().default('en'),
    tags: z.array(z.string()).default([]),
    repo_url: z.string().url().optional(),
  }),

  pricing: z
    .object({
      model: z.enum(['free', 'one_time', 'subscription']).default('one_time'),
      amount_cents: z.number().int().min(0).default(0),
      currency: z.string().length(3).default('usd'),
      stripe_price_id: z.string().optional(),
    })
    .default({}),

  ...CourseSharedFields,
});

export type CourseConfig = z.infer<typeof CourseConfigSchema>;

// ============================================================
// Union type for either config format (used by parseCourse)
// ============================================================
export type AnyCourseConfig = CourseYml | CourseConfig;
