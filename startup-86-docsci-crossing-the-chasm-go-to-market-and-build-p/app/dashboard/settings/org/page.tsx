"use client";
/**
 * /dashboard/settings/org — Organization settings: members, roles, invite links
 * Client component that calls the API routes.
 */
import { useEffect, useState, useCallback } from "react";

type OrgMember = {
  id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  joined_at: string;
};

type InviteToken = {
  id: string;
  role: "owner" | "editor" | "viewer";
  token: string;
  invite_url: string;
  label: string | null;
  created_at: string;
  expires_at: string;
  use_count: number;
  max_uses: number;
  expired: boolean;
  exhausted: boolean;
};

type Org = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  github_org: string | null;
  viewer_role: string;
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-900 text-purple-200 border-purple-700",
  editor: "bg-blue-900 text-blue-200 border-blue-700",
  viewer: "bg-gray-800 text-gray-300 border-gray-600",
};

const ROLE_EMOJI: Record<string, string> = {
  owner: "👑",
  editor: "✏️",
  viewer: "👁",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${ROLE_COLORS[role] ?? "bg-gray-800 text-gray-300 border-gray-600"}`}>
      {ROLE_EMOJI[role]} {role}
    </span>
  );
}

export default function OrgSettingsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create org form
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteRole, setInviteRole] = useState<"owner" | "editor" | "viewer">("editor");
  const [inviteLabel, setInviteLabel] = useState("");
  const [inviteMaxUses, setInviteMaxUses] = useState(1);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadOrgs = useCallback(async () => {
    const res = await fetch("/api/orgs");
    if (!res.ok) { setError("Could not load organizations"); return; }
    const data = await res.json();
    setOrgs(data.orgs ?? []);
    if (data.orgs?.length > 0 && !selectedOrg) {
      setSelectedOrg(data.orgs[0]);
    }
  }, [selectedOrg]);

  const loadMembers = useCallback(async (orgId: string) => {
    const res = await fetch(`/api/orgs/${orgId}/members`);
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members ?? []);
  }, []);

  const loadInvites = useCallback(async (orgId: string) => {
    const res = await fetch(`/api/orgs/${orgId}/invites`);
    if (!res.ok) return;
    const data = await res.json();
    setInvites(data.invites ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadOrgs().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
      if (["owner", "editor"].includes(selectedOrg.viewer_role)) {
        loadInvites(selectedOrg.id);
      }
    }
  }, [selectedOrg]);

  const handleCreateOrg = async () => {
    setCreating(true);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOrgName, slug: newOrgSlug }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error); return; }
    setShowCreateOrg(false);
    setNewOrgName(""); setNewOrgSlug("");
    await loadOrgs();
    setSelectedOrg(data.org);
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!selectedOrg) return;
    const res = await fetch(`/api/orgs/${selectedOrg.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    await loadMembers(selectedOrg.id);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedOrg || !confirm("Remove this member?")) return;
    const res = await fetch(`/api/orgs/${selectedOrg.id}/members/${memberId}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    await loadMembers(selectedOrg.id);
  };

  const handleCreateInvite = async () => {
    if (!selectedOrg) return;
    setCreatingInvite(true);
    const res = await fetch(`/api/orgs/${selectedOrg.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole, label: inviteLabel || null, max_uses: inviteMaxUses }),
    });
    const data = await res.json();
    setCreatingInvite(false);
    if (!res.ok) { setError(data.error); return; }
    setShowInviteForm(false);
    setInviteLabel(""); setInviteRole("editor"); setInviteMaxUses(1);
    await loadInvites(selectedOrg.id);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!selectedOrg || !confirm("Revoke this invite?")) return;
    await fetch(`/api/orgs/${selectedOrg.id}/invites?id=${inviteId}`, { method: "DELETE" });
    await loadInvites(selectedOrg.id);
  };

  const copyToClipboard = async (text: string, tokenId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedToken(tokenId);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="org-settings-page">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Organization Settings</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your org, members, and access roles</p>
          </div>
          <button
            onClick={() => setShowCreateOrg(!showCreateOrg)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
            data-testid="create-org-btn"
          >
            + New Org
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-700 rounded-lg text-red-300 text-sm flex justify-between" data-testid="error-banner">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Create Org Form */}
        {showCreateOrg && (
          <div className="mb-6 p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="create-org-form">
            <h3 className="text-white font-semibold mb-4">Create Organization</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value);
                    setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                  }}
                  placeholder="Acme Corp"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  data-testid="org-name-input"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                  placeholder="acme-corp"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                  data-testid="org-slug-input"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateOrg}
                disabled={creating || !newOrgName || !newOrgSlug}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                data-testid="create-org-submit"
              >
                {creating ? "Creating…" : "Create Organization"}
              </button>
              <button onClick={() => setShowCreateOrg(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Org selector */}
        {orgs.length === 0 ? (
          <div className="text-center py-16 text-gray-500" data-testid="no-orgs-message">
            <p className="text-4xl mb-3">🏢</p>
            <p className="font-medium text-gray-400">No organizations yet</p>
            <p className="text-sm">Create your first org to invite teammates</p>
          </div>
        ) : (
          <div className="flex gap-2 mb-6 flex-wrap" data-testid="org-selector">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedOrg?.id === org.id
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                }`}
                data-testid={`org-tab-${org.slug}`}
              >
                {org.name}
                <RoleBadge role={org.viewer_role} />
              </button>
            ))}
          </div>
        )}

        {selectedOrg && (
          <div className="space-y-6">
            {/* Org info */}
            <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="org-info">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedOrg.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    <span className="font-mono text-green-400">@{selectedOrg.slug}</span>
                    {" · "}{selectedOrg.plan} plan
                    {selectedOrg.github_org && ` · github.com/${selectedOrg.github_org}`}
                  </p>
                </div>
                <RoleBadge role={selectedOrg.viewer_role} />
              </div>
            </div>

            {/* Members */}
            <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="members-section">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold">Members ({members.length})</h3>
              </div>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg" data-testid={`member-row-${m.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-mono text-gray-400">
                        {m.user_id.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-gray-300 font-mono">{m.user_id.slice(0, 8)}…</p>
                        <p className="text-xs text-gray-500">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedOrg.viewer_role === "owner" ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          data-testid={`role-select-${m.id}`}
                        >
                          <option value="owner">👑 owner</option>
                          <option value="editor">✏️ editor</option>
                          <option value="viewer">👁 viewer</option>
                        </select>
                      ) : (
                        <RoleBadge role={m.role} />
                      )}
                      {(selectedOrg.viewer_role === "owner") && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950 transition-colors"
                          data-testid={`remove-member-${m.id}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite links — owner/editor only */}
            {["owner", "editor"].includes(selectedOrg.viewer_role) && (
              <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="invites-section">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-white font-semibold">Invite Links</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Share these links to add teammates — no email required</p>
                  </div>
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition-colors"
                    data-testid="create-invite-btn"
                  >
                    + New Invite
                  </button>
                </div>

                {/* Invite form */}
                {showInviteForm && (
                  <div className="mb-4 p-4 bg-gray-800 border border-gray-600 rounded-lg" data-testid="invite-form">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as "owner" | "editor" | "viewer")}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                          data-testid="invite-role-select"
                        >
                          {selectedOrg.viewer_role === "owner" && <option value="owner">👑 owner</option>}
                          <option value="editor">✏️ editor</option>
                          <option value="viewer">👁 viewer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Max uses</label>
                        <input
                          type="number"
                          value={inviteMaxUses}
                          onChange={(e) => setInviteMaxUses(parseInt(e.target.value) || 1)}
                          min={1} max={100}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                          data-testid="invite-max-uses-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Label (optional)</label>
                        <input
                          type="text"
                          value={inviteLabel}
                          onChange={(e) => setInviteLabel(e.target.value)}
                          placeholder="e.g. Team Alpha"
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                          data-testid="invite-label-input"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateInvite}
                        disabled={creatingInvite}
                        className="px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm rounded-lg"
                        data-testid="invite-submit-btn"
                      >
                        {creatingInvite ? "Generating…" : "Generate Link"}
                      </button>
                      <button onClick={() => setShowInviteForm(false)} className="px-4 py-1.5 bg-gray-700 text-gray-300 text-sm rounded-lg">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Invite list */}
                {invites.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No invite links yet</p>
                ) : (
                  <div className="space-y-2">
                    {invites.map((inv) => (
                      <div
                        key={inv.id}
                        className={`p-3 rounded-lg border flex items-center gap-3 ${inv.expired || inv.exhausted ? "bg-gray-900 border-gray-700 opacity-60" : "bg-gray-800 border-gray-600"}`}
                        data-testid={`invite-row-${inv.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <RoleBadge role={inv.role} />
                            {inv.label && <span className="text-xs text-gray-400">{inv.label}</span>}
                            {(inv.expired || inv.exhausted) && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-950 text-red-400 rounded border border-red-800">
                                {inv.expired ? "expired" : "exhausted"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate">{inv.invite_url}</p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {inv.use_count}/{inv.max_uses} uses · expires {new Date(inv.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!inv.expired && !inv.exhausted && (
                            <button
                              onClick={() => copyToClipboard(inv.invite_url, inv.id)}
                              className="px-2 py-1 bg-indigo-800 hover:bg-indigo-700 text-xs text-indigo-200 rounded transition-colors"
                              data-testid={`copy-invite-${inv.id}`}
                            >
                              {copiedToken === inv.id ? "✓ Copied" : "Copy"}
                            </button>
                          )}
                          {selectedOrg.viewer_role === "owner" && (
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="px-2 py-1 bg-red-950 hover:bg-red-900 text-xs text-red-400 rounded transition-colors"
                              data-testid={`revoke-invite-${inv.id}`}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Role explanation */}
                <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-400 font-medium mb-2">Role permissions</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <div>
                      <p className="text-purple-400 font-medium mb-1">👑 Owner</p>
                      <ul className="space-y-0.5">
                        <li>✓ Trigger CI runs</li>
                        <li>✓ Manage members</li>
                        <li>✓ Manage invites</li>
                        <li>✓ Delete org</li>
                        <li>✓ Change billing</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-blue-400 font-medium mb-1">✏️ Editor</p>
                      <ul className="space-y-0.5">
                        <li>✓ Trigger CI runs</li>
                        <li>✓ Create invites</li>
                        <li>✓ Manage projects</li>
                        <li>✗ Manage members</li>
                        <li>✗ Delete org</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium mb-1">👁 Viewer</p>
                      <ul className="space-y-0.5">
                        <li>✓ View findings</li>
                        <li>✓ View runs</li>
                        <li>✗ Trigger runs</li>
                        <li>✗ Manage anything</li>
                        <li className="text-yellow-600">RLS enforced</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
