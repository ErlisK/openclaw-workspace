'use client';
import * as React from 'react';
import { useState } from 'react';

interface Creator {
  id: string;
  display_name?: string | null;
  bio?: string | null;
  website_url?: string | null;
  twitter_handle?: string | null;
  github_handle?: string | null;
  avatar_url?: string | null;
  saas_tier?: string | null;
}

interface ProfileFormProps {
  creator: Creator | null;
}

export function ProfileForm({ creator }: ProfileFormProps) {
  const [form, setForm] = useState({
    display_name: creator?.display_name ?? '',
    bio: creator?.bio ?? '',
    website_url: creator?.website_url ?? '',
    twitter_handle: creator?.twitter_handle ?? '',
    github_handle: creator?.github_handle ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Failed to save');
    } else {
      setSaved(true);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Public profile</h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Display name</label>
        <input
          name="display_name"
          type="text"
          value={form.display_name}
          onChange={handleChange}
          maxLength={80}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
        <textarea
          name="bio"
          value={form.bio}
          onChange={handleChange}
          rows={3}
          maxLength={300}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 resize-none"
          placeholder="A short bio shown on your courses"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
          <input
            name="website_url"
            type="url"
            value={form.website_url}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            placeholder="https://yoursite.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">GitHub handle</label>
          <div className="flex">
            <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-2 text-xs text-gray-500">github.com/</span>
            <input
              name="github_handle"
              type="text"
              value={form.github_handle}
              onChange={handleChange}
              className="w-full rounded-r-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              placeholder="username"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Twitter / X handle</label>
        <div className="flex">
          <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-2 text-xs text-gray-500">@</span>
          <input
            name="twitter_handle"
            type="text"
            value={form.twitter_handle}
            onChange={handleChange}
            className="w-full rounded-r-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            placeholder="handle"
          />
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        <span className="font-medium">Plan:</span>{' '}
        <span className="capitalize">{creator?.saas_tier ?? 'free'}</span>
      </div>
    </form>
  );
}
