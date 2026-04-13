import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });

const OWNER = process.env.GITHUB_REPO_OWNER || "ErlisK";
const REPO = process.env.GITHUB_REPO_NAME || "openclaw-workspace";
const BRANCH = process.env.GITHUB_DATA_BRANCH || "main";

export async function getFile(path: string): Promise<{ content: string; sha: string } | null> {
  try {
    const res = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path, ref: BRANCH });
    const data = res.data as { content: string; sha: string; encoding: string };
    const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
    return { content, sha: data.sha };
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e?.status === 404) return null;
    throw err;
  }
}

export async function appendJsonl(path: string, obj: Record<string, unknown>): Promise<void> {
  const line = JSON.stringify(obj) + "\n";
  let attempt = 0;
  while (attempt < 2) {
    const existing = await getFile(path);
    const newContent = existing ? existing.content + line : line;
    const encoded = Buffer.from(newContent).toString("base64");
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path,
        message: `data: append ${path.split("/").pop()}`,
        content: encoded,
        sha: existing?.sha,
        branch: BRANCH,
      });
      return;
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e?.status === 409 && attempt === 0) {
        attempt++;
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
}

export function todayPath(prefix: string, type: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `data/claimcheck-studio/${prefix}/${type}-${d}.jsonl`;
}
