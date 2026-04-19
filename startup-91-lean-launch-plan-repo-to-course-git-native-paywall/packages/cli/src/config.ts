/**
 * .coursekitrc config management
 *
 * Config file lives at <course-root>/.coursekitrc (JSON)
 * Ignored via .gitignore (contains API key).
 *
 * Schema:
 * {
 *   "apiUrl": "https://teachrepo.com",
 *   "apiKey": "tr_live_xxxxxxxx",  ← optional, prefer env var
 *   "courseId": "uuid",
 *   "courseSlug": "my-course-slug",
 *   "linkedAt": "ISO timestamp"
 * }
 */

import fs from 'fs';
import path from 'path';

export interface CoursekitConfig {
  apiUrl: string;
  apiKey?: string;
  courseId?: string;
  courseSlug?: string;
  linkedAt?: string;
}

const RC_FILENAME = '.coursekitrc';

export function findRcPath(startDir: string = process.cwd()): string | null {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, RC_FILENAME);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

export function readConfig(cwd: string = process.cwd()): CoursekitConfig | null {
  const rcPath = findRcPath(cwd);
  if (!rcPath) return null;
  try {
    return JSON.parse(fs.readFileSync(rcPath, 'utf-8')) as CoursekitConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: CoursekitConfig, cwd: string = process.cwd()): void {
  const rcPath = path.join(cwd, RC_FILENAME);
  fs.writeFileSync(rcPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  // Add .coursekitrc to .gitignore if not already there
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf-8');
    if (!existing.includes(RC_FILENAME)) {
      fs.appendFileSync(gitignorePath, `\n# TeachRepo local config (contains API key)\n${RC_FILENAME}\n`);
    }
  }
}

export function resolveApiKey(opts: { apiKey?: string }): string {
  return opts.apiKey || process.env.TEACHREPO_API_KEY || '';
}

export function resolveApiUrl(opts: { apiUrl?: string }, config: CoursekitConfig | null): string {
  return (opts.apiUrl || config?.apiUrl || process.env.TEACHREPO_API_URL || 'https://teachrepo.com').replace(/\/$/, '');
}
