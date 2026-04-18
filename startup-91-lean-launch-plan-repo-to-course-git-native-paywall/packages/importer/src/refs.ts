/**
 * GitHub ref resolution helpers — branches, tags, and annotated tag dereferencing.
 * Used by the importer to resolve a named ref to a full commit SHA.
 */

const GITHUB_API = 'https://api.github.com';

function ghHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TeachRepo-Importer/1.0',
  };
  if (token) h['Authorization'] = `token ${token}`;
  return h;
}

async function ghGet(url: string, token?: string): Promise<unknown> {
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} — ${url}`);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RefType = 'branch' | 'tag';

export interface ResolvedRef {
  /** The resolved ref name (branch name or tag name) */
  ref: string;
  refType: RefType;
  /** Full 40-char commit SHA */
  commitSha: string;
  /** Short SHA — first 7 chars */
  shortSha: string;
  /** The repo's default branch (always populated) */
  defaultBranch: string;
}

export interface RepoRefs {
  defaultBranch: string;
  branches: Array<{ name: string; commitSha: string }>;
  tags: Array<{ name: string; commitSha: string }>;
}

// ─── Default branch detection ─────────────────────────────────────────────────

/**
 * Fetch the repo's default branch from GitHub.
 * Falls back to 'main' if the API call fails or returns an unexpected shape.
 */
export async function getDefaultBranch(
  owner: string,
  repo: string,
  token?: string
): Promise<string> {
  try {
    const data = (await ghGet(
      `${GITHUB_API}/repos/${owner}/${repo}`,
      token
    )) as { default_branch?: string };
    return data.default_branch ?? 'main';
  } catch {
    return 'main';
  }
}

// ─── Branch resolution ────────────────────────────────────────────────────────

export async function resolveBranchSha(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<string> {
  const data = (await ghGet(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    token
  )) as { commit: { sha: string } };
  return data.commit.sha;
}

// ─── Tag resolution (with annotated tag dereferencing) ───────────────────────

/**
 * Resolve a tag name to its underlying commit SHA.
 * Handles both lightweight tags (point directly to commit) and
 * annotated tags (point to a tag object which then points to a commit).
 */
export async function resolveTagSha(
  owner: string,
  repo: string,
  tag: string,
  token?: string
): Promise<string> {
  // GET /repos/{owner}/{repo}/git/ref/tags/{tag}
  const refData = (await ghGet(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/tags/${encodeURIComponent(tag)}`,
    token
  )) as { object: { type: string; sha: string } };

  if (refData.object.type === 'commit') {
    // Lightweight tag — already a commit SHA
    return refData.object.sha;
  }

  if (refData.object.type === 'tag') {
    // Annotated tag — dereference the tag object to get the commit SHA
    const tagData = (await ghGet(
      `${GITHUB_API}/repos/${owner}/${repo}/git/tags/${refData.object.sha}`,
      token
    )) as { object: { sha: string } };
    return tagData.object.sha;
  }

  throw new Error(
    `Unexpected ref type "${refData.object.type}" for tag "${tag}" in ${owner}/${repo}`
  );
}

// ─── Main resolver ────────────────────────────────────────────────────────────

/**
 * Resolve a named ref (branch or tag) to a full commit SHA.
 *
 * If ref is undefined or null, resolves the default branch.
 *
 * @param owner - GitHub repo owner
 * @param repo  - GitHub repo name
 * @param ref   - Branch name, tag name, or undefined (→ default branch)
 * @param refType - 'branch' | 'tag' | undefined (auto-detect if undefined)
 * @param token - Optional GitHub PAT
 */
export async function resolveRef(
  owner: string,
  repo: string,
  ref: string | undefined,
  refType: RefType | undefined,
  token?: string
): Promise<ResolvedRef> {
  const defaultBranch = await getDefaultBranch(owner, repo, token);

  // No ref specified → use default branch
  if (!ref) {
    const commitSha = await resolveBranchSha(owner, repo, defaultBranch, token);
    return {
      ref: defaultBranch,
      refType: 'branch',
      commitSha,
      shortSha: commitSha.slice(0, 7),
      defaultBranch,
    };
  }

  // Explicit tag
  if (refType === 'tag') {
    const commitSha = await resolveTagSha(owner, repo, ref, token);
    return {
      ref,
      refType: 'tag',
      commitSha,
      shortSha: commitSha.slice(0, 7),
      defaultBranch,
    };
  }

  // Explicit branch (or type not specified → try branch)
  const commitSha = await resolveBranchSha(owner, repo, ref, token);
  return {
    ref,
    refType: 'branch',
    commitSha,
    shortSha: commitSha.slice(0, 7),
    defaultBranch,
  };
}

// ─── Refs listing (for picker UI) ────────────────────────────────────────────

/**
 * List all branches and tags for a repo.
 * Used by GET /api/repos/refs to populate the branch/tag picker UI.
 */
export async function listRepoRefs(
  owner: string,
  repo: string,
  token?: string
): Promise<RepoRefs> {
  const [defaultBranch, branchesData, tagsData] = await Promise.all([
    getDefaultBranch(owner, repo, token),
    ghGet(`${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100`, token) as Promise<
      Array<{ name: string; commit: { sha: string } }>
    >,
    ghGet(`${GITHUB_API}/repos/${owner}/${repo}/tags?per_page=100`, token) as Promise<
      Array<{ name: string; commit: { sha: string } }>
    >,
  ]);

  return {
    defaultBranch,
    branches: (branchesData as Array<{ name: string; commit: { sha: string } }>).map((b) => ({
      name: b.name,
      commitSha: b.commit.sha,
    })),
    tags: (tagsData as Array<{ name: string; commit: { sha: string } }>).map((t) => ({
      name: t.name,
      commitSha: t.commit.sha,
    })),
  };
}

// ─── Version label helpers ────────────────────────────────────────────────────

/**
 * Compute the display version label for a course version.
 *
 * Priority: tag name > SemVer from course.yml > short SHA
 *
 * @param opts.tagName    - Git tag name (e.g. "v2.0.0")
 * @param opts.configVersion - version from course.yml (e.g. "1.2.0")
 * @param opts.commitSha  - Full commit SHA
 */
export function computeVersionLabel(opts: {
  tagName?: string | null;
  configVersion?: string | null;
  commitSha: string;
}): string {
  if (opts.tagName) return opts.tagName;

  if (opts.configVersion && isSemVer(opts.configVersion)) {
    return opts.configVersion;
  }

  return `sha:${opts.commitSha.slice(0, 7)}`;
}

function isSemVer(s: string): boolean {
  return /^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/.test(s);
}
