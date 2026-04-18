import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { CourseConfigSchema, type CourseConfig } from './schemas';
import { parseLesson, type ParsedLesson } from './parseLesson';

export interface ParsedCourse {
  config: CourseConfig;
  lessons: ParsedLesson[];
  dir: string;
}

/**
 * Parse a full course from a directory.
 * Reads course.config.yaml and all lesson Markdown files.
 */
export async function parseCourse(dir: string): Promise<ParsedCourse> {
  const configPath = path.join(dir, 'course.config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`course.config.yaml not found in ${dir}`);
  }

  const raw = yaml.load(fs.readFileSync(configPath, 'utf-8'));
  const config = CourseConfigSchema.parse(raw);

  const lessonsDir = path.join(dir, config.lessonsDir);
  const lessonFiles = fs
    .readdirSync(lessonsDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const lessons = await Promise.all(
    lessonFiles.map((f) => parseLesson(path.join(lessonsDir, f)))
  );

  // Sort by order_index if defined
  lessons.sort((a, b) => (a.frontmatter.order ?? 0) - (b.frontmatter.order ?? 0));

  return { config, lessons, dir };
}
