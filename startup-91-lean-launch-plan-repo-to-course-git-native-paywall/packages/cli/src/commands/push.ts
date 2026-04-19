/**
 * teachrepo push [--api-url <url>] [--token <token>] [--draft]
 *
 * Pushes the current course directory to a TeachRepo instance via POST /api/import.
 * Reads config from .teachrepo/config.json (set by `teachrepo link`) or --api-url flag.
 * Auth via TEACHREPO_API_KEY env var or --token flag.
 *
 * What it sends:
 *   - The course.yml content
 *   - lesson file contents (with frontmatter)
 *   - quiz YAML contents
 *   - current git commit SHA (for versioning)
 *   - git remote URL (repo_url for versioning)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface TeachRepoConfig {
  apiUrl: string;
}

interface PushOptions {
  apiUrl?: string;
  token?: string;
  draft?: boolean;
  dryRun?: boolean;
}

function readConfig(cwd: string): TeachRepoConfig | null {
  const configPath = path.join(cwd, '.teachrepo', 'config.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as TeachRepoConfig;
  } catch {
    return null;
  }
}

function getGitInfo(cwd: string): { sha: string; remoteUrl: string | null } {
  let sha = '';
  let remoteUrl: string | null = null;
  try {
    sha = execSync('git rev-parse HEAD', { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { /* not a git repo */ }
  try {
    remoteUrl = execSync('git remote get-url origin', { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { /* no remote */ }
  return { sha, remoteUrl };
}

function readLessons(lessonsDir: string): Array<{ filename: string; content: string }> {
  if (!fs.existsSync(lessonsDir)) return [];
  return fs.readdirSync(lessonsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => ({ filename: f, content: fs.readFileSync(path.join(lessonsDir, f), 'utf-8') }));
}

function readQuizzes(quizzesDir: string): Array<{ filename: string; content: string }> {
  if (!fs.existsSync(quizzesDir)) return [];
  return fs.readdirSync(quizzesDir)
    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort()
    .map(f => ({ filename: f, content: fs.readFileSync(path.join(quizzesDir, f), 'utf-8') }));
}

export async function pushCommand(opts: PushOptions) {
  const cwd = process.cwd();

  // ── Resolve API URL ──────────────────────────────────────────────────────
  const config = readConfig(cwd);
  const apiUrl = (opts.apiUrl || config?.apiUrl || process.env.TEACHREPO_API_URL || '').replace(/\/$/, '');

  if (!apiUrl) {
    console.error('❌ No API URL configured.');
    console.error('   Run `teachrepo link --api-url https://teachrepo.com` first,');
    console.error('   or pass --api-url to this command.');
    process.exit(1);
  }

  // ── Resolve auth token ───────────────────────────────────────────────────
  const token = opts.token || process.env.TEACHREPO_API_KEY || '';
  if (!token) {
    console.error('❌ No API key found.');
    console.error('   Set TEACHREPO_API_KEY env var or pass --token <key>.');
    process.exit(1);
  }

  // ── Read course files ────────────────────────────────────────────────────
  const courseYmlPath = path.join(cwd, 'course.yml');
  if (!fs.existsSync(courseYmlPath)) {
    console.error('❌ course.yml not found. Run `teachrepo init` first.');
    process.exit(1);
  }

  const courseYml = fs.readFileSync(courseYmlPath, 'utf-8');
  const lessons = readLessons(path.join(cwd, 'lessons'));
  const quizzes = readQuizzes(path.join(cwd, 'quizzes'));
  const { sha: gitSha, remoteUrl } = getGitInfo(cwd);

  console.log('');
  console.log('📦 teachrepo push');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`   API:     ${apiUrl}`);
  console.log(`   Lessons: ${lessons.length}`);
  console.log(`   Quizzes: ${quizzes.length}`);
  if (gitSha) console.log(`   SHA:     ${gitSha.slice(0, 8)}`);
  if (opts.draft) console.log('   Mode:    DRAFT');
  console.log('');

  if (opts.dryRun) {
    console.log('🔍 Dry run — no data sent.');
    return;
  }

  // ── Build the import payload ──────────────────────────────────────────────
  // The /api/import endpoint accepts:
  //   { repoUrl, ref?, token? } — fetches from GitHub
  // OR for direct push (this CLI path):
  //   { courseYml, lessons[], quizzes[], gitSha?, draft? }
  //
  // We use the direct payload format for `push` (no GitHub intermediate).
  const payload = {
    courseYml,
    lessons,
    quizzes,
    gitSha: gitSha || undefined,
    repoUrl: remoteUrl || undefined,
    draft: opts.draft || false,
  };

  // ── POST to /api/import (direct payload) ──────────────────────────────────
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`❌ Network error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const body = await response.json().catch(() => ({ error: 'Non-JSON response' })) as Record<string, unknown>;

  if (!response.ok) {
    console.error(`❌ Import failed (HTTP ${response.status}): ${body.error || JSON.stringify(body)}`);
    process.exit(1);
  }

  const courseUrl = body.courseUrl || `${apiUrl}/courses/${body.slug || ''}`;
  const versionId = body.versionId || '';

  console.log(`✅ Course published!`);
  console.log(`   URL:     ${courseUrl}`);
  if (versionId) console.log(`   Version: ${versionId}`);
  console.log('');
}
