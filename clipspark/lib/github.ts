const GITHUB_API = "https://api.github.com";

interface GitHubContent {
  content: string;
  sha: string;
}

export async function getContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch = "main"
): Promise<{ data: GitHubContent | null; sha: string | null }> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error(`GitHub getContent failed: ${res.status}`);
  const data = await res.json();
  return { data, sha: data.sha };
}

export async function putContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha: string | null,
  branch = "main"
): Promise<void> {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GitHub putContent failed: ${res.status} ${await res.text()}`);
  }
}
