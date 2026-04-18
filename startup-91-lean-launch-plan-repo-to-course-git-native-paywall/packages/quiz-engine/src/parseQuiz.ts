import { z } from 'zod';
import type { QuizFrontmatter } from '@teachrepo/types';

const QuizFrontmatterSchema = z.array(
  z.object({
    question: z.string().min(1),
    type: z.enum(['multiple_choice', 'true_false', 'short_answer']).default('multiple_choice'),
    options: z.array(z.string()).optional(),
    correct: z.union([z.number().int().min(0), z.boolean()]),
    explanation: z.string().optional(),
  })
);

/**
 * Parse and validate quiz questions from YAML frontmatter.
 * Returns an array of typed QuizFrontmatter objects.
 * Throws ZodError if the schema is invalid.
 */
export function parseQuiz(frontmatter: unknown): QuizFrontmatter[] {
  if (!frontmatter) return [];
  const result = QuizFrontmatterSchema.safeParse(frontmatter);
  if (!result.success) {
    throw new Error(
      `Invalid quiz frontmatter: ${result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`
    );
  }
  return result.data;
}
