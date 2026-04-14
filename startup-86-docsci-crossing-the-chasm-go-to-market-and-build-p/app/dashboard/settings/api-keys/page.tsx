"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Token {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked: boolean;
}

export default function ApiKeysPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch current org ID from memberships
    fetch("/api/orgs")
      .then((r) => r.json())
      .then((data) => {
        const firstOrg = data.orgs?.[0];
        if (firstOrg) {
          setOrgId(firstOrg.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchTokens = useCallback(async () => {
    if (!orgId) return;
    const res = await fetch(`/api/tokens?org_id=${orgId}`);
    const data = await res.json();
    if (data.tokens) setTokens(data.tokens);
  }, [orgId]);

  useEffect(() => {
    if (orgId) fetchTokens();
  }, [orgId, fetchTokens]);

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !newKeyName.trim()) return;
    setCreating(true);
    setError("");
    setRevealedToken(null);

    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: orgId, name: newKeyName.trim(), scopes: ["read", "runs:write"] }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setRevealedToken(data.token);
      setNewKeyName("");
      await fetchTokens();
    }
    setCreating(false);
  }

  async function revokeToken(tokenId: string) {
    if (!orgId) return;
    if (!confirm("Revoke this API key? This cannot be undone.")) return;

    const res = await fetch("/api/tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: orgId, token_id: tokenId }),
    });
    if (res.ok) {
      await fetchTokens();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/dashboard/settings" className="text-sm text-gray-500 hover:text-gray-300 mb-2 block">
              ← Settings
            </Link>
            <h1 className="text-2xl font-bold text-white">API Keys</h1>
            <p className="text-gray-400 text-sm mt-1">
              Use API keys to authenticate against the DocsCI REST API. Keys are shown once — save them securely.
            </p>
          </div>
        </div>

        {/* Create new key */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Create new API key</h2>
          {!orgId && (
            <p className="text-sm text-yellow-400 mb-4">
              You need an org to create API keys.{" "}
              <Link href="/dashboard/settings/org" className="underline">
                Create an org
              </Link>
            </p>
          )}
          <form onSubmit={createToken} className="flex gap-3">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. CI pipeline)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              required
              disabled={!orgId}
            />
            <button
              type="submit"
              disabled={creating || !orgId}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {creating ? "Creating…" : "Create key"}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Revealed token */}
        {revealedToken && (
          <div className="bg-green-950 border border-green-800 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 text-green-300 font-semibold text-sm mb-2">
              <span>✅</span> API key created — copy it now, it won&apos;t be shown again
            </div>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-gray-900 text-green-300 text-sm font-mono px-4 py-2.5 rounded-lg overflow-auto">
                {revealedToken}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(revealedToken);
                }}
                className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setRevealedToken(null)}
              className="text-xs text-gray-500 hover:text-gray-300 mt-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Token list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">
              {tokens.length > 0 ? `${tokens.length} key${tokens.length !== 1 ? "s" : ""}` : "No keys yet"}
            </h2>
          </div>
          {tokens.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-600 text-sm">
              No API keys yet. Create one above to get started.
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {tokens.map((token) => (
                <li key={token.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{token.name}</span>
                      {token.revoked && (
                        <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 font-mono">
                      {token.token_prefix}••••••••
                    </div>
                    <div className="flex gap-3 text-xs text-gray-600 mt-1">
                      <span>Created {new Date(token.created_at).toLocaleDateString()}</span>
                      {token.last_used_at && (
                        <span>Last used {new Date(token.last_used_at).toLocaleDateString()}</span>
                      )}
                      <span>{(token.scopes ?? []).join(", ")}</span>
                    </div>
                  </div>
                  {!token.revoked && (
                    <button
                      onClick={() => revokeToken(token.id)}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-600 mt-6">
          Keys are hashed with SHA-256 before storage. We never store the plaintext key.{" "}
          <Link href="/docs/security" className="hover:text-gray-400">
            Security docs →
          </Link>
        </p>
      </div>
    </div>
  );
}
