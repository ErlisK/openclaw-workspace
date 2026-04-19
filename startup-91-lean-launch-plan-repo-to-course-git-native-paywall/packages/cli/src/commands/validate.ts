/**
 * teachrepo validate
 *
 * Validates the course structure in the current directory:
 *  - course.yml is present and has required fields
 *  - All lessons have required frontmatter (title, slug, order, access)
 *  - quiz_id references resolve to existing quizzes/
 *  - Quiz YAML has valid structure
 *  - No duplicate lesson slugs
 */

import fs from 'fs';
import path from 'path';

interface FrontmatterData {
  title?: string;
  slug?: string;
  order?: number;
  access?: string;
  quiz_id?: string;
  estimated_minutes?: number;
  description?: string;
}

function parseFrontmatter(raw: string): { data: FrontmatterData; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data: FrontmatterData = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w[\w_-]*):\s*"?([^"#]*)"?\s*(?:#.*)?$/);
    if (kv) {
      const [, key, val] = kv;
      const trimmed = val.trim();
      if (key === 'order') (data as Record<string, unknown>)[key] = parseInt(trimmed, 10);
      else (data as Record<string, unknown>)[key] = trimmed;
    }
  }
  return { data, content: match[2] };
}

function parseYamlBasic(raw: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const line of raw.split('\n')) {
    const kv = line.match(/^(\w[\w_-]*):\s*"?([^"#]*)"?\s*(?:#.*)?$/);
    if (kv) {
      const [, key, val] = kv;
      const trimmed = val.trim();
      if (trimmed === 'true') data[key] = true;
      else if (trimmed === 'false') data[key] = false;
      else if (/^\d+$/.test(trimmed)) data[key] = parseInt(trimmed, 10);
      else data[key] = trimmed;
    }
  }
  return data;
}

export async function validateCommand() {
  const cwd = process.cwd();
  const errors: string[] = [];
  const warnings: string[] = [];
  const log = (msg: string) => console.log(msg);

  log('');
  log('🔍 teachrepo validate');
  log('─────────────────────────────────────────────────────────');

  // ── 1. course.yml ─────────────────────────────────────────────────────────
  const courseYmlPath = path.join(cwd, 'course.yml');
  if (!fs.existsSync(courseYmlPath)) {
    errors.push('course.yml not found. Run `teachrepo init` to create one.');
  } else {
    const courseYml = parseYamlBasic(fs.readFileSync(courseYmlPath, 'utf-8'));
    const required = ['title', 'slug', 'price_cents', 'currency'];
    for (const field of required) {
      if (!courseYml[field] && courseYml[field] !== 0) {
        errors.push(`course.yml: missing required field "${field}"`);
      }
    }
    if (courseYml.slug && !/^[a-z0-9-]+$/.test(String(courseYml.slug))) {
      errors.push(`course.yml: slug "${courseYml.slug}" must be lowercase kebab-case (a-z, 0-9, hyphens only)`);
    }
    if (courseYml.price_cents !== undefined && courseYml.price_cents !== '' && Number(courseYml.price_cents) < 0) {
      errors.push('course.yml: price_cents must be >= 0');
    }
    if (courseYml.affiliate_pct !== undefined && (Number(courseYml.affiliate_pct) < 0 || Number(courseYml.affiliate_pct) > 100)) {
      warnings.push('course.yml: affiliate_pct should be between 0 and 100');
    }
    log(`✅ course.yml — title: "${courseYml.title}", slug: "${courseYml.slug}", price: $${(Number(courseYml.price_cents || 0) / 100).toFixed(2)}`);
  }

  // ── 2. lessons/ ───────────────────────────────────────────────────────────
  const lessonsDir = path.join(cwd, 'lessons');
  if (!fs.existsSync(lessonsDir)) {
    errors.push('lessons/ directory not found');
  } else {
    const lessonFiles = fs.readdirSync(lessonsDir)
      .filter(f => f.endsWith('.md'))
      .sort();

    if (lessonFiles.length === 0) {
      errors.push('lessons/ directory has no .md files');
    }

    const slugsSeen = new Set<string>();
    for (const file of lessonFiles) {
      const raw = fs.readFileSync(path.join(lessonsDir, file), 'utf-8');
      const { data } = parseFrontmatter(raw);

      const required = ['title', 'slug', 'order', 'access'];
      for (const field of required) {
        if (!data[field as keyof FrontmatterData]) {
          errors.push(`lessons/${file}: missing frontmatter field "${field}"`);
        }
      }

      if (data.slug) {
        if (slugsSeen.has(data.slug)) {
          errors.push(`lessons/${file}: duplicate slug "${data.slug}"`);
        }
        slugsSeen.add(data.slug);
      }

      if (data.access && !['free', 'paid'].includes(data.access)) {
        errors.push(`lessons/${file}: access must be "free" or "paid" (got "${data.access}")`);
      }

      if (data.estimated_minutes && Number(data.estimated_minutes) > 120) {
        warnings.push(`lessons/${file}: estimated_minutes > 120 — consider splitting the lesson`);
      }

      log(`  📄 ${file} — slug: "${data.slug}", access: ${data.access}, quiz: ${data.quiz_id || 'none'}`);
    }
    log(`✅ lessons/ — ${lessonFiles.length} lesson${lessonFiles.length !== 1 ? 's' : ''}`);
  }

  // ── 3. quizzes/ ───────────────────────────────────────────────────────────
  const quizzesDir = path.join(cwd, 'quizzes');
  const quizIds = new Set<string>();

  if (fs.existsSync(quizzesDir)) {
    const quizFiles = fs.readdirSync(quizzesDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    for (const file of quizFiles) {
      const quizData = parseYamlBasic(fs.readFileSync(path.join(quizzesDir, file), 'utf-8'));
      if (!quizData.id) {
        errors.push(`quizzes/${file}: missing required field "id"`);
      } else {
        quizIds.add(String(quizData.id));
      }
      if (!quizData.title) warnings.push(`quizzes/${file}: missing "title" field`);
      log(`  📝 ${file} — id: "${quizData.id}"`);
    }
    if (quizFiles.length > 0) log(`✅ quizzes/ — ${quizFiles.length} quiz file${quizFiles.length !== 1 ? 's' : ''}`);
  } else {
    log('ℹ️  No quizzes/ directory (optional)');
  }

  // Verify quiz_id references from lessons
  if (fs.existsSync(lessonsDir)) {
    const lessonFiles = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md'));
    for (const file of lessonFiles) {
      const raw = fs.readFileSync(path.join(lessonsDir, file), 'utf-8');
      const { data } = parseFrontmatter(raw);
      if (data.quiz_id && !quizIds.has(data.quiz_id)) {
        errors.push(`lessons/${file}: quiz_id "${data.quiz_id}" not found in quizzes/`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  log('');
  if (warnings.length > 0) {
    for (const w of warnings) console.warn(`  ⚠️  ${w}`);
    log('');
  }

  if (errors.length > 0) {
    console.error(`❌ Validation failed — ${errors.length} error${errors.length !== 1 ? 's' : ''}:`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    log('');
    process.exit(1);
  } else {
    log(`✅ Validation passed${warnings.length > 0 ? ` (${warnings.length} warning${warnings.length !== 1 ? 's' : ''})` : ''}`);
    log('');
  }
}
