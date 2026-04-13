"use client";

import { useState, useEffect, useCallback } from "react";

type ResearchRecord = {
  id: number;
  research_type: "competitor" | "pain_point" | "beachhead_signal" | "icp";
  title: string;
  content: Record<string, unknown>;
  tags: string[];
  source: string;
  priority: number;
  created_at: string;
};

type ApiResponse = {
  records: ResearchRecord[];
  counts: Record<string, number>;
  total: number;
};

const TYPE_LABELS: Record<string, string> = {
  competitor: "🏢 Competitor",
  pain_point: "💬 Pain Point",
  beachhead_signal: "📊 Beachhead Signal",
  icp: "🎯 ICP",
};

const TYPE_COLORS: Record<string, string> = {
  competitor: "bg-purple-900/40 text-purple-300 border-purple-700",
  pain_point: "bg-red-900/40 text-red-300 border-red-700",
  beachhead_signal: "bg-blue-900/40 text-blue-300 border-blue-700",
  icp: "bg-green-900/40 text-green-300 border-green-700",
};

export default function AdminResearchPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ResearchRecord | null>(null);
  const [addForm, setAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    research_type: "pain_point",
    title: "",
    content: "{}",
    tags: "",
    source: "",
    priority: 5,
  });

  const fetchData = useCallback(async (key: string, type = "all", q = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ type, limit: "200" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/market-research?${params}`, {
        headers: { "x-admin-key": key },
      });
      if (res.status === 401) { setError("Invalid admin key"); setAuthenticated(false); return; }
      const json = await res.json();
      setData(json);
      setAuthenticated(true);
    } catch {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) fetchData(adminKey, filter, search);
  }, [filter, authenticated, adminKey, fetchData, search]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(adminKey);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const content = JSON.parse(newRecord.content);
      const tags = newRecord.tags.split(",").map(t => t.trim()).filter(Boolean);
      const res = await fetch("/api/market-research", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ ...newRecord, content, tags }),
      });
      if (res.ok) {
        setAddForm(false);
        setNewRecord({ research_type: "pain_point", title: "", content: "{}", tags: "", source: "", priority: 5 });
        fetchData(adminKey, filter, search);
      }
    } catch {
      setError("Invalid JSON in content field");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">⚡</span>
            <span className="font-bold text-xl text-white">DocsCI Admin</span>
            <span className="text-xs bg-yellow-900/40 text-yellow-300 border border-yellow-700 px-2 py-0.5 rounded-full ml-auto">Research DB</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Admin Key</label>
              <input
                type="password"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Enter admin key..."
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Access Research DB →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <span className="font-bold text-white">DocsCI</span>
            </a>
            <span className="text-gray-600">/</span>
            <span className="text-sm text-gray-400">Admin</span>
            <span className="text-gray-600">/</span>
            <span className="text-sm text-yellow-300">market_research</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/docs/research" className="text-xs text-gray-400 hover:text-white transition-colors border border-gray-700 px-3 py-1.5 rounded-lg">
              Public research page →
            </a>
            <a href="/docs/research.md" className="text-xs text-gray-400 hover:text-white transition-colors border border-gray-700 px-3 py-1.5 rounded-lg">
              research.md →
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{Object.values(data.counts).reduce((a, b) => a + b, 0)}</div>
              <div className="text-xs text-gray-500">Total records</div>
            </div>
            {Object.entries(data.counts).map(([type, count]) => (
              <div key={type}
                className={`rounded-xl p-4 text-center border cursor-pointer transition-all ${filter === type ? "ring-1 ring-indigo-500" : ""} ${TYPE_COLORS[type] || "bg-gray-900 border-gray-800"}`}
                onClick={() => setFilter(filter === type ? "all" : type)}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs opacity-70">{TYPE_LABELS[type] || type}</div>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search records..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="all">All types</option>
            <option value="competitor">Competitors</option>
            <option value="pain_point">Pain points</option>
            <option value="beachhead_signal">Beachhead signals</option>
            <option value="icp">ICP</option>
          </select>
          <button
            onClick={() => setAddForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            + Add record
          </button>
          <button
            onClick={() => fetchData(adminKey, filter, search)}
            className="border border-gray-700 hover:border-gray-500 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Add form modal */}
        {addForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
              <h3 className="font-semibold text-white mb-4">Add Research Record</h3>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">Type</label>
                  <select value={newRecord.research_type} onChange={e => setNewRecord({ ...newRecord, research_type: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="competitor">competitor</option>
                    <option value="pain_point">pain_point</option>
                    <option value="beachhead_signal">beachhead_signal</option>
                    <option value="icp">icp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Title</label>
                  <input value={newRecord.title} onChange={e => setNewRecord({ ...newRecord, title: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Content (JSON)</label>
                  <textarea value={newRecord.content} onChange={e => setNewRecord({ ...newRecord, content: e.target.value })}
                    rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Tags (comma-separated)</label>
                    <input value={newRecord.tags} onChange={e => setNewRecord({ ...newRecord, tags: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Source</label>
                    <input value={newRecord.source} onChange={e => setNewRecord({ ...newRecord, source: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Priority (1-10)</label>
                  <input type="number" min={1} max={10} value={newRecord.priority}
                    onChange={e => setNewRecord({ ...newRecord, priority: parseInt(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium">Save</button>
                  <button type="button" onClick={() => setAddForm(false)} className="flex-1 border border-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Records table */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading...</div>
        ) : data ? (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-8">ID</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Tags</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Source</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-8">P</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r, i) => (
                  <tr key={r.id}
                    className={`border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? "bg-gray-900/20" : ""} ${selected?.id === r.id ? "bg-indigo-950/30" : ""}`}
                    onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{r.id}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[r.research_type] || "bg-gray-800 text-gray-300 border-gray-700"}`}>
                        {r.research_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-200 max-w-xs">
                      <span className="block truncate">{r.title}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(r.tags || []).slice(0, 3).map(t => (
                          <span key={t} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {(r.tags || []).length > 3 && <span className="text-xs text-gray-600">+{r.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-32">
                      <span className="block truncate">{r.source}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-mono ${r.priority >= 8 ? "text-green-400" : r.priority >= 5 ? "text-yellow-400" : "text-gray-500"}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
              <span>Showing {data.records.length} records</span>
              <span>market_research table · Supabase</span>
            </div>
          </div>
        ) : null}

        {/* Detail panel */}
        {selected && (
          <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[selected.research_type] || ""} mr-2`}>
                  {selected.research_type}
                </span>
                <span className="font-semibold text-white">{selected.title}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-300 text-xl leading-none">×</button>
            </div>
            <pre className="bg-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
              {JSON.stringify(selected.content, null, 2)}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              {(selected.tags || []).map(t => (
                <span key={t} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
