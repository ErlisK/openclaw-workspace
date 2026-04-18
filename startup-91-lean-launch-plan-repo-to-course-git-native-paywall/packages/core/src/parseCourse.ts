import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  CourseConfigSchema,
  CourseYmlSchema,
  type CourseConfig,
  type CourseYml,
  type AnyCourseConfig,
} from './schemas';
import { parseLesson, type ParsedLesson } from './parseLesson';

export interface ParsedCourse {
  config: AnyCourseConfig;
  /** 'course.yml' | 'course.config.yaml' */
  configFormat: 'course.yml' | 'course.config.yaml';
  lessons: ParsedLesson[];
  dir: string;
}

/**
 * Locate the course config file in a directory.
 * Supports both course.yml (new flat format) and course.config.yaml (legacy nested format).
 * course.yml takes precedence if both exist.
 */
export function findCourseConfigFile(dir: string): { filePath: string; format: 'course.yml' | 'course.config.yaml' } {
  const candidates: Array<{ filePath: string; format: 'course.yml' | 'course.config.yaml' }> = [
    { filePath: path.join(dir, 'course.yml'), format: 'course.yml' },
    { filePath: path.join(dir, 'course.config.yaml'), format: 'course.config.yaml' },
    { filePath: path.join(dir, 'course.config.yml'), format: 'course.config.yaml' },
  ];
  for (const c of candidates) {
    if (fs.existsSync(c.filePath)) return c;
  }
  throw new Error(
    `No course config found in ${dir}. Expected course.yml or course.config.yaml`
  );
}

/**
 * Parse the raw YAML from a course config file.
 * Chooses the right schema based on the file format detected.
 */
export function parseCourseConfig(
  raw: unknown,
  format: 'course.yml' | 'course.config.yaml'
): AnyCourseConfig {
  if (format === 'course.yml') {
    return CourseYmlSchema.parse(raw);
  }
  return CourseConfigSchema.parse(raw);
}

/**
 * Extract lessons_dir from either config format.
 */
function getLessonsDir(config: AnyCourseConfig): string {
  return (config as CourseYml).lessons_dir ?? (config as CourseConfig).lessons_dir ?? './lessons';
}

/**
 * Parse a full course from a directory.
 * Reads course.yml (or course.config.yaml as fallback) and all lesson Markdown files.
 */
export async function parseCourse(dir: string): Promise<ParsedCourse> {
  const { filePath: configPath, format: configFormat } = findCourseConfigFile(dir);

  const raw = yaml.load(fs.readFileSync(configPath, 'utf-8'));
  const config = parseCourseConfig(raw, configFormat);

  const lessonsDirRelative = getLessonsDir(config);
  const lessonsDir = path.join(dir, lessonsDirRelative);

  if (!fs.existsSync(lessonsDir)) {
    throw new Error(`Lessons directory not found: ${lessonsDir}`);
  }

  const lessonFiles = fs
    .readdirSync(lessonsDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const lessons = await Promise.all(
    lessonFiles.map((f) => parseLesson(path.join(lessonsDir, f)))
  );

  // Sort by frontmatter.order (ascending)
  lessons.sort((a, b) => (a.frontmatter.order ?? 0) - (b.frontmatter.order ?? 0));

  return { config, configFormat, lessons, dir };
}
