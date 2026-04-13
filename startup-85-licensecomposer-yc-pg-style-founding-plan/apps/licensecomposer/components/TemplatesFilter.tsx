'use client';
/**
 * components/TemplatesFilter.tsx
 * Client-side search + category filter for the templates page.
 */

import { useState, useMemo } from 'react';
import TemplateCard from '@/components/TemplateCard';

const CATEGORY_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Asset License', value: 'digital_asset_license' },
  { label: 'Commission', value: 'commission_agreement' },
  { label: 'Collaborator Split', value: 'collaborator_split' },
  { label: 'NFT License', value: 'nft_license' },
];

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  document_type: string;
  tier: string;
  price_cents: number;
  tags: string[] | null;
  jurisdictions: string[] | null;
  platforms: string[] | null;
  lawyer_reviewed: boolean;
  is_featured: boolean;
  current_version: string;
  userHasAccess: boolean;
  isPremium: boolean;
  priceDollars: number;
}

export default function TemplatesFilter({
  templates,
  hasUnlimited,
}: {
  templates: Template[];
  hasUnlimited: boolean;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchesQuery =
        !query ||
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (t.tags ?? []).some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      const matchesCategory = !category || t.document_type === category;
      return matchesQuery && matchesCategory;
    });
  }, [templates, query, category]);

  const freeTemplates = filtered.filter(t => t.tier === 'free');
  const premiumTemplates = filtered.filter(t => t.tier === 'premium');

  return (
    <div className="space-y-8">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search templates…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                category === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No templates found</p>
          <p className="text-sm mt-1">Try a different search term or category.</p>
          <button onClick={() => { setQuery(''); setCategory(''); }} className="mt-4 text-indigo-600 text-sm hover:underline">
            Clear filters
          </button>
        </div>
      )}

      {/* Premium templates */}
      {premiumTemplates.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>⭐</span> Premium Templates
              <span className="text-sm font-normal text-gray-500 ml-1">— Lawyer-reviewed, $5 each or free with Unlimited</span>
            </h2>
            {hasUnlimited && (
              <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">✅ All unlocked</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {premiumTemplates.map(t => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}

      {/* Free templates */}
      {freeTemplates.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🆓</span> Free Templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {freeTemplates.map(t => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
