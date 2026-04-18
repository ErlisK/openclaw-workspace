import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { QuizFileSchema, type QuizFile } from './schemas';
import type { ParsedCourse } from './parseCourse';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validate a fully parsed course.
 *
 * Checks:
 *   - No duplicate lesson slugs
 *   - No duplicate order values
 *   - quiz_id references exist as quizzes/{id}.yml files
 *   - Each quiz file passes QuizFileSchema validation
 *   - Quiz `id` field matches filename
 *   - Stripe price ID present if pricing model is one_time/subscription
 *   - At least one lesson
 *   - sandbox_url is HTTPS (if present)
 */
export function validateCourse(course: ParsedCourse): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // ── At least one lesson ───────────────────────────────────────────────────
  if (course.lessons.length === 0) {
    errors.push({
      field: 'lessons',
      code: 'EmptyLessons',
      message: 'Course has no lessons',
    });
  }

  // ── Duplicate slugs ───────────────────────────────────────────────────────
  const slugCounts = new Map<string, number>();
  for (const lesson of course.lessons) {
    slugCounts.set(lesson.slug, (slugCounts.get(lesson.slug) ?? 0) + 1);
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) {
      errors.push({
        field: 'lessons',
        code: 'DuplicateSlug',
        message: `Duplicate lesson slug: "${slug}" appears ${count} times`,
      });
    }
  }

  // ── Duplicate order values ────────────────────────────────────────────────
  const orderCounts = new Map<number, string[]>();
  for (const lesson of course.lessons) {
    const order = lesson.frontmatter.order;
    const existing = orderCounts.get(order) ?? [];
    orderCounts.set(order, [...existing, lesson.slug]);
  }
  for (const [order, slugs] of orderCounts) {
    if (slugs.length > 1) {
      errors.push({
        field: 'lessons',
        code: 'DuplicateOrder',
        message: `Lessons share order=${order}: ${slugs.join(', ')}`,
      });
    }
  }

  // ── Quiz file resolution ──────────────────────────────────────────────────
  const quizzesDir = path.join(course.dir, 'quizzes');

  for (const lesson of course.lessons) {
    const { quiz_id, slug: lessonSlug, sandbox_url } = lesson.frontmatter;

    // quiz_id must resolve to an existing file
    if (quiz_id) {
      const quizPath = path.join(quizzesDir, `${quiz_id}.yml`);

      if (!fs.existsSync(quizPath)) {
        errors.push({
          field: `lessons.${lessonSlug}.quiz_id`,
          code: 'MissingQuizFile',
          message: `quiz_id "${quiz_id}" does not resolve to quizzes/${quiz_id}.yml`,
        });
      } else {
        // Validate the quiz file itself
        const quizErrors = validateQuizFile(quizPath, quiz_id);
        errors.push(...quizErrors);
      }
    }

    // sandbox_url must be HTTPS
    if (sandbox_url && !sandbox_url.startsWith('https://')) {
      errors.push({
        field: `lessons.${lessonSlug}.sandbox_url`,
        code: 'InvalidSandboxUrl',
        message: `sandbox_url must start with https://`,
      });
    }
  }

  // ── Stripe price ID warning ───────────────────────────────────────────────
  const { model } = course.config.pricing;
  if ((model === 'one_time' || model === 'subscription') && !course.config.pricing.stripe_price_id) {
    warnings.push(
      `pricing.stripe_price_id is not set — Stripe checkout will not work until configured`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Parse and validate a single quiz YAML file.
 * Returns an array of ValidationErrors (empty = valid).
 */
function validateQuizFile(quizPath: string, expectedId: string): ValidationError[] {
  const errors: ValidationError[] = [];

  let raw: unknown;
  try {
    raw = yaml.load(fs.readFileSync(quizPath, 'utf-8'));
  } catch (e) {
    errors.push({
      field: `quizzes/${expectedId}.yml`,
      code: 'YamlParseError',
      message: `Failed to parse YAML: ${(e as Error).message}`,
    });
    return errors;
  }

  const result = QuizFileSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.errors) {
      errors.push({
        field: `quizzes/${expectedId}.yml#${issue.path.join('.')}`,
        code: 'QuizSchemaError',
        message: issue.message,
      });
    }
    return errors;
  }

  const quiz = result.data;

  // Quiz id must match filename
  if (quiz.id !== expectedId) {
    errors.push({
      field: `quizzes/${expectedId}.yml#id`,
      code: 'QuizIdMismatch',
      message: `Quiz id "${quiz.id}" does not match filename "${expectedId}.yml"`,
    });
  }

  return errors;
}

/**
 * Parse a standalone quiz YAML file and return the validated QuizFile.
 * Throws on parse or validation error.
 */
export function parseQuizFile(quizPath: string): QuizFile {
  const raw = yaml.load(fs.readFileSync(quizPath, 'utf-8'));
  return QuizFileSchema.parse(raw);
}
