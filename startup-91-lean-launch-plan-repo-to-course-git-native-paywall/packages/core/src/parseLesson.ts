import * as fs from 'fs';
import matter from 'gray-matter';
import { LessonFrontmatterSchema, type LessonFrontmatter } from './schemas';

export interface ParsedLesson {
  filePath: string;
  slug: string;
  frontmatter: LessonFrontmatter;
  content: string;     // Markdown body (without frontmatter)
  rawSource: string;   // Full file content
}

/**
 * Parse a single lesson Markdown file.
 * Extracts and validates YAML frontmatter, returns body content.
 */
export async function parseLesson(filePath: string): Promise<ParsedLesson> {
  const rawSource = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(rawSource);

  const frontmatter = LessonFrontmatterSchema.parse(data);

  // Derive slug from filename if not in frontmatter
  const slug =
    frontmatter.slug ??
    filePath
      .split('/')
      .pop()!
      .replace(/\.md$/, '');

  return { filePath, slug, frontmatter, content, rawSource };
}
