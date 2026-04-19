/**
 * teachrepo link --api-url <url> [--api-key <key>]
 *
 * Links the current course directory to a TeachRepo instance:
 *   1. Validates connectivity to the API
 *   2. Creates (or retrieves) the course record via POST /api/courses/link
 *   3. Stores apiUrl, apiKey, courseId, courseSlug in .coursekitrc
 *
 * .coursekitrc is added to .gitignore automatically.
 */

import fs from 'fs';
import path from 'path';
import { writeConfig, readConfig, resolveApiKey, resolveApiUrl } from '../config.js';

interface LinkOptions {
  apiUrl?: string;
  apiKey?: string;
}

function readCourseYml(cwd: string): Record<string, string> {
  const yml = fs.readFileSync(path.join(cwd, 'course.yml'), 'utf-8');
  const data: Record<string, string> = {};
  for (const line of yml.split('\n')) {
    const m = line.match(/^(\w[\w_-]*):\s*"?([^"#\n]*)"?\s*(?:#.*)?$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return data;
}

export async function linkCommand(opts: LinkOptions) {
  const cwd = process.cwd();

  // ── Resolve credentials ───────────────────────────────────────────────────
  const apiKey = resolveApiKey(opts);
  const existingConfig = readConfig(cwd);
  const apiUrl = resolveApiUrl(opts, existingConfig);

  if (!apiKey) {
    console.error('❌ No API key provided.');
    console.error('   Pass --api-key <key> or set TEACHREPO_API_KEY env var.');
    console.error('');
    console.error('   Get your API key at: ' + apiUrl + '/dashboard/settings');
    process.exit(1);
  }

  // ── Read course.yml ───────────────────────────────────────────────────────
  const courseYmlPath = path.join(cwd, 'course.yml');
  if (!fs.existsSync(courseYmlPath)) {
    console.error('❌ course.yml not found. Run `teachrepo init` first.');
    process.exit(1);
  }

  const courseData = readCourseYml(cwd);
  const slug = courseData.slug || '';
  const title = courseData.title || '';

  if (!slug) {
    console.error('❌ course.yml is missing "slug" field.');
    process.exit(1);
  }

  console.log('');
  console.log('🔗 teachrepo link');
  console.log('──────────────────────────────────────────────────────');
  console.log('   API:   ' + apiUrl);
  console.log('   Slug:  ' + slug);
  console.log('   Title: ' + title);
  console.log('');

  // ── POST /api/courses/link — create or retrieve course ────────────────────
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/courses/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ slug, title, courseYml: fs.readFileSync(courseYmlPath, 'utf-8') }),
    });
  } catch (err) {
    console.error(`❌ Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`   Is ${apiUrl} reachable?`);
    process.exit(1);
  }

  let courseId = '';
  let courseSlug = slug;

  if (response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    courseId = (body.courseId || body.id || '') as string;
    courseSlug = (body.slug || slug) as string;
    console.log('✅ Course linked: ' + apiUrl + '/courses/' + courseSlug);
    if (courseId) console.log('   Course ID: ' + courseId);
  } else if (response.status === 404) {
    // /api/courses/link not implemented — store config anyway for push
    console.log('⚠️  /api/courses/link not found — storing config for push.');
    console.log('   Course will be created on first `teachrepo push`.');
  } else if (response.status === 409) {
    // Already exists
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    courseId = (body.courseId || body.id || '') as string;
    console.log('✅ Course already exists: ' + apiUrl + '/courses/' + courseSlug);
  } else {
    const text = await response.text().catch(() => '');
    console.error(`❌ Link failed (HTTP ${response.status}): ${text.slice(0, 200)}`);
    process.exit(1);
  }

  // ── Write .coursekitrc ────────────────────────────────────────────────────
  writeConfig({
    apiUrl,
    apiKey,
    courseId: courseId || undefined,
    courseSlug,
    linkedAt: new Date().toISOString(),
  }, cwd);

  console.log('✅ Saved .coursekitrc');
  console.log('');
  console.log('Next steps:');
  console.log('   teachrepo push          — push your course content');
  console.log('   teachrepo validate      — check for errors');
  console.log('');
}
