/**
 * repo-import.ts — import a public GitHub repo by URL
 *
 * Fetches docs files via:
 *   1. GitHub Contents API (/repos/{owner}/{repo}/git/trees/HEAD?recursive=1)
 *   2. raw.githubusercontent.com for file contents
 *
 * Parses Markdown with remark to extract:
 *   - Code fences (language + content + line position)
 *   - Links (for broken-link detection)
 *   - Headings (for structure analysis)
 *
 * No GitHub token required for public repos (60 req/h unauthenticated).
 * Token is used if GITHUB_TOKEN env var is set (5000 req/h).
 */

import { remark } from "remark";
import remarkParse from "remark-parse";

export interface CodeFence {
  language: string;
  code: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

export interface DocLink {
  url: string;
  text: string;
  filePath: string;
  line: number;
}

export interface ParsedDoc {
  filePath: string;
  title: string;
  wordCount: number;
  codeFences: CodeFence[];
  links: DocLink[];
  headings: string[];
  rawContent: string;
}

export interface RepoImportResult {
  owner: string;
  repo: string;
  branch: string;
  defaultBranch: string;
  filesFound: number;
  filesScanned: string[];
  filesSkipped: string[];
  docs: ParsedDoc[];
  totalCodeFences: number;
  languages: string[];
  totalLinks: number;
  openapiFiles: string[];
  importedAt: string;
  durationMs: number;
}

const LANGUAGE_MAP: Record<string, string> = {
  python: "python", py: "python",
  javascript: "javascript", js: "javascript",
  typescript: "typescript", ts: "typescript",
  bash: "bash", sh: "bash", shell: "bash",
  go: "go", golang: "go",
  ruby: "ruby", rb: "ruby",
  java: "java",
  rust: "rust", rs: "rust",
  cpp: "cpp", "c++": "cpp",
  c: "c",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  yaml: "yaml", yml: "yaml",
  json: "json",
  sql: "sql",
};

const DOCS_EXTENSIONS = new Set([".md", ".mdx", ".markdown"]);
const OPENAPI_EXTENSIONS = new Set([".yaml", ".yml", ".json"]);
const MAX_FILES = 50; // cap to avoid rate limits
const MAX_FILE_SIZE = 200_000; // 200KB

function parseGithubUrl(url: string): { owner: string; repo: string; branch?: string; path?: string } | null {
  // Normalize: strip trailing slash, .git
  const clean = url.trim().replace(/\.git$/, "").replace(/\/$/, "");

  // https://github.com/owner/repo
  // https://github.com/owner/repo/tree/branch/path
  const match = clean.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?/
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3],
    path: match[4],
  };
}

async function githubFetch(path: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DocsCI/1.0",
  };
  if (token) headers["Authorization"] = `token ${token}`;
  return fetch(`https://api.github.com${path}`, { headers });
}

async function fetchRaw(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  const res = await fetch(url, { headers: { "User-Agent": "DocsCI/1.0" } });
  if (!res.ok) return null;
  const text = await res.text();
  if (text.length > MAX_FILE_SIZE) return text.slice(0, MAX_FILE_SIZE);
  return text;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCodeFences(ast: any, filePath: string): CodeFence[] {
  const fences: CodeFence[] = [];

  function walk(node: any) {
    if (node.type === "code") {
      const lang = node.lang?.toLowerCase() ?? "";
      const mappedLang = LANGUAGE_MAP[lang] ?? lang ?? "text";
      const lineStart = node.position?.start?.line ?? 0;
      const lineEnd = node.position?.end?.line ?? lineStart;
      fences.push({
        language: mappedLang,
        code: node.value ?? "",
        filePath,
        lineStart,
        lineEnd,
      });
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }

  walk(ast);
  return fences;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLinks(ast: any, filePath: string): DocLink[] {
  const links: DocLink[] = [];

  function walk(node: any) {
    if (node.type === "link") {
      const text = node.children
        ?.map((c: any) => (c.type === "text" ? c.value : ""))
        .join("") ?? "";
      links.push({
        url: node.url ?? "",
        text,
        filePath,
        line: node.position?.start?.line ?? 0,
      });
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }

  walk(ast);
  return links;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractHeadings(ast: any): string[] {
  const headings: string[] = [];
  function walk(node: any) {
    if (node.type === "heading") {
      const text = node.children
        ?.map((c: any) => (c.type === "text" ? c.value : ""))
        .join("") ?? "";
      headings.push(`${"#".repeat(node.depth)} ${text}`);
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }
  walk(ast);
  return headings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTitle(ast: any): string {
  function walk(node: any): string | null {
    if (node.type === "heading" && node.depth === 1) {
      return node.children
        ?.map((c: any) => (c.type === "text" ? c.value : ""))
        .join("") ?? "";
    }
    if (node.children) {
      for (const child of node.children) {
        const t = walk(child);
        if (t) return t;
      }
    }
    return null;
  }
  return walk(ast) ?? "Untitled";
}

function isOpenapiFile(path: string, content: string): boolean {
  if (!OPENAPI_EXTENSIONS.has("." + path.split(".").pop()?.toLowerCase())) return false;
  return (
    content.includes("openapi:") ||
    content.includes('"openapi"') ||
    content.includes("swagger:") ||
    content.includes('"swagger"')
  );
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function importRepoByUrl(repoUrl: string): Promise<RepoImportResult> {
  const t0 = Date.now();
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    throw new Error(`Invalid GitHub URL: "${repoUrl}". Expected format: https://github.com/owner/repo`);
  }

  const { owner, repo } = parsed;

  // 1. Get default branch
  const repoRes = await githubFetch(`/repos/${owner}/${repo}`, token);
  if (!repoRes.ok) {
    if (repoRes.status === 404) throw new Error(`Repository not found: ${owner}/${repo}. Make sure it exists and is public.`);
    if (repoRes.status === 403) throw new Error(`Rate limited by GitHub API. Try again in a minute.`);
    throw new Error(`GitHub API error: ${repoRes.status} ${repoRes.statusText}`);
  }
  const repoData = await repoRes.json();
  const defaultBranch: string = parsed.branch ?? repoData.default_branch ?? "main";

  // 2. Fetch file tree
  const treeRes = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    token
  );
  if (!treeRes.ok) {
    throw new Error(`Could not fetch repo tree: ${treeRes.status} ${treeRes.statusText}`);
  }
  const treeData = await treeRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allFiles: Array<{ path: string; type: string; size?: number }> = treeData.tree ?? [];

  // Filter to docs files + OpenAPI files
  const docsFiles = allFiles.filter(f => {
    if (f.type !== "blob") return false;
    const ext = "." + (f.path.split(".").pop()?.toLowerCase() ?? "");
    if (DOCS_EXTENSIONS.has(ext)) return true;
    return false;
  });

  const openapiCandidates = allFiles.filter(f => {
    if (f.type !== "blob") return false;
    const ext = "." + (f.path.split(".").pop()?.toLowerCase() ?? "");
    const name = f.path.split("/").pop()?.toLowerCase() ?? "";
    return (
      OPENAPI_EXTENSIONS.has(ext) &&
      (name.includes("openapi") || name.includes("swagger") || name.includes("api-spec"))
    );
  });

  // Cap to MAX_FILES — prefer docs in /docs, /documentation, /guide paths
  const sortedDocs = docsFiles.sort((a, b) => {
    const aScore = a.path.includes("docs/") || a.path.includes("documentation/") ? 1 : 0;
    const bScore = b.path.includes("docs/") || b.path.includes("documentation/") ? 1 : 0;
    return bScore - aScore;
  });
  const filesToProcess = sortedDocs.slice(0, MAX_FILES);
  const skippedFiles = sortedDocs.slice(MAX_FILES).map(f => f.path);

  // 3. Fetch and parse each doc
  const processor = remark().use(remarkParse);
  const docs: ParsedDoc[] = [];
  const openapiFiles: string[] = [];

  // Parallel fetch with concurrency limit
  const concurrency = 5;
  for (let i = 0; i < filesToProcess.length; i += concurrency) {
    const batch = filesToProcess.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (file) => {
        const content = await fetchRaw(owner, repo, defaultBranch, file.path);
        if (!content) return null;

        const ast = processor.parse(content);
        const codeFences = extractCodeFences(ast, file.path);
        const links = extractLinks(ast, file.path);
        const headings = extractHeadings(ast);
        const title = extractTitle(ast);

        return {
          filePath: file.path,
          title,
          wordCount: countWords(content),
          codeFences,
          links,
          headings,
          rawContent: content,
        } as ParsedDoc;
      })
    );
    docs.push(...results.filter((r): r is ParsedDoc => r !== null));
  }

  // Check OpenAPI candidates
  for (const f of openapiCandidates.slice(0, 5)) {
    const content = await fetchRaw(owner, repo, defaultBranch, f.path);
    if (content && isOpenapiFile(f.path, content)) {
      openapiFiles.push(f.path);
    }
  }

  const allFences = docs.flatMap(d => d.codeFences);
  const langSet: Record<string, true> = {};
  for (const f of allFences) if (f.language) langSet[f.language] = true;
  const langs = Object.keys(langSet);

  return {
    owner,
    repo,
    branch: defaultBranch,
    defaultBranch,
    filesFound: docsFiles.length,
    filesScanned: filesToProcess.map(f => f.path),
    filesSkipped: skippedFiles,
    docs,
    totalCodeFences: allFences.length,
    languages: langs,
    totalLinks: docs.reduce((sum, d) => sum + d.links.length, 0),
    openapiFiles,
    importedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
