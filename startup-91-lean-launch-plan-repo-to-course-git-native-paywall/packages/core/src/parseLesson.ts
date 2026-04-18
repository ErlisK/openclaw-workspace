import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { LessonFrontmatterSchema, type LessonFrontmatter } from './schemas';

export interface ParsedLesson {
  filePath: string;
  /** Derived from frontmatter.slug (authoritative) or filename if slug absent */
  slug: string;
  frontmatter: LessonFrontmatter;
  /** Markdown body — everything after the closing --- delimiter */
  content: string;
  /** Full raw file source including frontmatter block */
  rawSource: string;
}

/**
 * Parse a single lesson Markdown file.
 *
 * Extracts and validates YAML frontmatter against LessonFrontmatterSchema.
 * Throws a ZodError with a descriptive message if validation fails.
 */
export async function parseLesson(filePath: string): Promise<ParsedLesson> {
  const rawSource = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(rawSource);

  // Validate against schema — throws ZodError on failure
  const result = LessonFrontmatterSchema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(
      `Invalid frontmatter in ${path.basename(filePath)}:\n${messages}`
    );
  }

  const frontmatter = result.data;

  // slug in frontmatter is authoritative; fall back to filename-derived slug
  const slug =
    frontmatter.slug ??
    path
      .basename(filePath, '.md')
      .replace(/^\d+-/, '') // strip leading NN- prefix
      .toLowerCase();

  return { filePath, slug, frontmatter, content: content.trim(), rawSource };
}
