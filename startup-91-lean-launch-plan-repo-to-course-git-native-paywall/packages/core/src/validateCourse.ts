import type { ParsedCourse } from './parseCourse';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validate a parsed course: check for duplicate slugs, ordering gaps, quiz structure.
 */
export function validateCourse(course: ParsedCourse): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check for duplicate lesson slugs
  const slugs = course.lessons.map((l) => l.slug);
  const duplicateSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (duplicateSlugs.length > 0) {
    errors.push({ field: 'lessons', message: `Duplicate lesson slugs: ${duplicateSlugs.join(', ')}` });
  }

  // Check stripe price id if paid
  if (course.config.pricing.model === 'one_time' && !course.config.pricing.stripePriceId) {
    warnings.push('pricing.stripePriceId is not set — Stripe checkout will not work until configured');
  }

  // Check at least one lesson
  if (course.lessons.length === 0) {
    errors.push({ field: 'lessons', message: 'Course has no lessons' });
  }

  // Check quiz structure
  for (const lesson of course.lessons) {
    for (let i = 0; i < lesson.frontmatter.quiz.length; i++) {
      const q = lesson.frontmatter.quiz[i];
      if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
        errors.push({
          field: `${lesson.slug}.quiz[${i}]`,
          message: 'multiple_choice questions must have at least 2 options',
        });
      }
      if (q.type === 'multiple_choice' && typeof q.correct === 'number') {
        if (q.options && q.correct >= q.options.length) {
          errors.push({
            field: `${lesson.slug}.quiz[${i}]`,
            message: `correct index ${q.correct} is out of bounds (${q.options.length} options)`,
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
