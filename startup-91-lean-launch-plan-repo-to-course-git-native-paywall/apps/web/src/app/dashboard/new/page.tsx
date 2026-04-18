'use client';
import * as React from 'react';
import { useState } from 'react';

export default function NewCoursePage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ courseSlug?: string; error?: string } | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error ?? 'Import failed' });
      else setResult({ courseSlug: data.courseSlug });
    } catch (err) {
      setResult({ error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Import a GitHub Repo</h1>
      <p className="mb-8 text-sm text-gray-600">Paste the URL of a public GitHub repo that contains a <code className="rounded bg-gray-100 px-1">course.yml</code> and a <code className="rounded bg-gray-100 px-1">lessons/</code> folder.</p>

      {result?.courseSlug ? (
        <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-semibold text-green-900 mb-4">Course imported successfully!</p>
          <a href={`/dashboard`} className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            Go to dashboard →
          </a>
        </div>
      ) : (
        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">GitHub repo URL</label>
            <input
              type="url"
              required
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            {loading ? 'Importing…' : 'Import repo →'}
          </button>
        </form>
      )}
    </div>
  );
}
