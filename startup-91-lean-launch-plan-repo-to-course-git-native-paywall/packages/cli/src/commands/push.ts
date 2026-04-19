/**
 * teachrepo push [options]
 *
 * Reads course files + git metadata and POSTs to /api/import.
 * Config is read from .coursekitrc (set by `teachrepo link`).
 *
 * The server endpoint stores a course_version record with the commit SHA,
 * upserts lessons and quizzes, and returns the course URL.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { readConfig, resolveApiKey, resolveApiUrl } from '../config.js';

interface PushOptions {
  apiUrl?: string;
  apiKey?: string;
  draft?: boolean;
  dryRun?: boolean;
}

function getGitInfo(cwd: string): { sha: string; branch: string; remoteUrl: string | null } {
  const run = (cmd: string) => {
    try {
      return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch {
      return '';
    }
  };
  return {
    sha: run('git rev-parse HEAD'),
    branch: run('git rev-parse --abbrev-ref HEAD'),
    remoteUrl: run('git remote get-url origin') || null,
  };
}

function readLessons(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()
    .map(f => ({ filename: f, content: fs.readFileSync(path.join(dir, f), 'utf-8') }));
}

function readQuizzes(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')).sort()
    .map(f => ({ filename: f, content: fs.readFileSync(path.join(dir, f), 'utf-8') }));
}

export async function pushCommand(opts: PushOptions) {
  const cwd = process.cwd();
  const config = readConfig(cwd);
  const apiUrl = resolveApiUrl(opts, config);
  const apiKey = opts.apiKey || config?.apiKey || resolveApiKey(opts);

  if (!apiKey) {
    console.error('❌ No API key. Run `teachrepo link` or set TEACHREPO_API_KEY.');
    process.exit(1);
  }

  const courseYmlPath = path.join(cwd, 'course.yml');
  if (!fs.existsSync(courseYmlPath)) {
    console.error('❌ course.yml not found. Run `teachrepo init` first.');
    process.exit(1);
  }

  const courseYml = fs.readFileSync(courseYmlPath, 'utf-8');
  const lessons = readLessons(path.join(cwd, 'lessons'));
  const quizzes = readQuizzes(path.join(cwd, 'quizzes'));
  const git = getGitInfo(cwd);

  console.log('');
  console.log('📦 teachrepo push');
  console.log('──────────────────────────────────────────────────────');
  console.log('   API:     ' + apiUrl);
  console.log('   Lessons: ' + lessons.length);
  console.log('   Quizzes: ' + quizzes.length);
  if (git.sha) console.log('   SHA:     ' + git.sha.slice(0, 8) + (git.branch ? ' (' + git.branch + ')' : ''));
  if (opts.draft) console.log('   Mode:    DRAFT');
  console.log('');

  if (opts.dryRun) {
    console.log('🔍 Dry run — nothing sent.');
    return;
  }

  // Build payload matching /api/import expectations
  const payload = {
    // Direct-push format (no GitHub intermediate fetch)
    courseYml,
    lessons,
    quizzes,
    gitSha: git.sha || undefined,
    gitBranch: git.branch || undefined,
    repoUrl: git.remoteUrl || undefined,
    courseId: config?.courseId || undefined,
    draft: opts.draft || false,
  };

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`❌ Network error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const body = await response.json().catch(() => ({ error: 'Non-JSON response' })) as Record<string, unknown>;

  if (!response.ok) {
    console.error(`❌ Push failed (HTTP ${response.status}): ${body.error || JSON.stringify(body).slice(0, 200)}`);
    process.exit(1);
  }

  const slug = (body.slug || body.courseSlug || config?.courseSlug || '') as string;
  const versionId = (body.versionId || '') as string;
  const courseUrl = slug ? `${apiUrl}/courses/${slug}` : apiUrl;

  console.log('✅ Course published!');
  console.log('   URL: ' + courseUrl);
  if (versionId) console.log('   Version: ' + versionId);
  console.log('');
}
