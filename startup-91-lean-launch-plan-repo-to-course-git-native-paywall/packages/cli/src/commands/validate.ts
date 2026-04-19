/**
 * teachrepo validate — local course structure validation
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
}

function parseFrontmatter(raw: string): FrontmatterData {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data: FrontmatterData = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w[\w_-]*):\s*"?([^"#\n]*)"?/);
    if (!m) continue;
    const [, k, v] = m;
    const val = v.trim();
    if (k === 'order') (data as Record<string, unknown>)[k] = parseInt(val, 10);
    else (data as Record<string, unknown>)[k] = val;
  }
  return data;
}

function parseYamlBasic(raw: string): Record<string, string | number | boolean> {
  const data: Record<string, string | number | boolean> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^(\w[\w_-]*):\s*"?([^"#\n]*)"?/);
    if (!m) continue;
    const [, k, v] = m;
    const val = v.trim();
    if (val === 'true') data[k] = true;
    else if (val === 'false') data[k] = false;
    else if (/^\d+$/.test(val)) data[k] = parseInt(val, 10);
    else data[k] = val;
  }
  return data;
}

export async function validateCommand() {
  const cwd = process.cwd();
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('');
  console.log('🔍 teachrepo validate');
  console.log('──────────────────────────────────────────────────────');

  // ── course.yml ──────────────────────────────────────────────────────────
  const courseYmlPath = path.join(cwd, 'course.yml');
  if (!fs.existsSync(courseYmlPath)) {
    errors.push('course.yml not found. Run `teachrepo init` to create one.');
  } else {
    const yml = parseYamlBasic(fs.readFileSync(courseYmlPath, 'utf-8'));
    for (const f of ['title', 'slug', 'price_cents', 'currency']) {
      if (yml[f] === undefined || yml[f] === '') errors.push(`course.yml: missing field "${f}"`);
    }
    const slug = String(yml.slug || '');
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      errors.push(`course.yml: slug must be lowercase kebab-case (got "${slug}")`);
    }
    console.log(`✅ course.yml — title: "${yml.title}", slug: "${yml.slug}", price: $${(Number(yml.price_cents || 0) / 100).toFixed(2)}`);
  }

  // ── lessons/ ─────────────────────────────────────────────────────────────
  const lessonsDir = path.join(cwd, 'lessons');
  const quizIds = new Set<string>();

  if (!fs.existsSync(lessonsDir)) {
    errors.push('lessons/ directory not found');
  } else {
    const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md')).sort();
    if (files.length === 0) errors.push('lessons/ has no .md files');

    const slugsSeen = new Set<string>();
    for (const file of files) {
      const data = parseFrontmatter(fs.readFileSync(path.join(lessonsDir, file), 'utf-8'));
      for (const f of ['title', 'slug', 'order', 'access']) {
        if (!data[f as keyof FrontmatterData]) errors.push(`lessons/${file}: missing frontmatter field "${f}"`);
      }
      if (data.slug) {
        if (slugsSeen.has(data.slug)) errors.push(`lessons/${file}: duplicate slug "${data.slug}"`);
        slugsSeen.add(data.slug);
      }
      if (data.access && !['free', 'paid'].includes(data.access)) {
        errors.push(`lessons/${file}: access must be "free" or "paid" (got "${data.access}")`);
      }
      console.log(`  📄 ${file} — slug:${data.slug}, access:${data.access}${data.quiz_id ? ', quiz:' + data.quiz_id : ''}`);
    }
    console.log(`✅ lessons/ — ${files.length} lesson(s)`);
  }

  // ── quizzes/ ─────────────────────────────────────────────────────────────
  const quizzesDir = path.join(cwd, 'quizzes');
  if (fs.existsSync(quizzesDir)) {
    const files = fs.readdirSync(quizzesDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    for (const file of files) {
      const d = parseYamlBasic(fs.readFileSync(path.join(quizzesDir, file), 'utf-8'));
      if (!d.id) errors.push(`quizzes/${file}: missing "id" field`);
      else quizIds.add(String(d.id));
      if (!d.title) warnings.push(`quizzes/${file}: missing "title" field`);
      console.log(`  📝 ${file} — id:"${d.id}"`);
    }
    if (files.length > 0) console.log(`✅ quizzes/ — ${files.length} file(s)`);
  }

  // Verify quiz_id references
  if (fs.existsSync(lessonsDir)) {
    for (const f of fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md'))) {
      const data = parseFrontmatter(fs.readFileSync(path.join(lessonsDir, f), 'utf-8'));
      if (data.quiz_id && !quizIds.has(data.quiz_id)) {
        errors.push(`lessons/${f}: quiz_id "${data.quiz_id}" not found in quizzes/`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  for (const w of warnings) console.warn('  ⚠️  ' + w);
  if (warnings.length) console.log('');

  if (errors.length > 0) {
    console.error(`❌ ${errors.length} error(s):`);
    for (const e of errors) console.error('  ✗ ' + e);
    console.log('');
    process.exit(1);
  } else {
    console.log(`✅ Validation passed${warnings.length ? ' (' + warnings.length + ' warning(s))' : ''}`);
    console.log('');
  }
}
