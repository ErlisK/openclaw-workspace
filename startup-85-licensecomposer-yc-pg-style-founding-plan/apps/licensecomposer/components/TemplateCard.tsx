'use client';
/**
 * components/TemplateCard.tsx
 * Template card for the marketplace page.
 * Shows lock icon + purchase CTA for premium templates the user hasn't unlocked.
 */
import React, { useState } from 'react';
import Link from 'next/link';

interface Template {
  id:             string;
  slug:           string;
  name:           string;
  description:    string | null;
  document_type:  string;
  tier:           string;
  priceDollars:   number;
  tags:           string[] | null;
  jurisdictions:  string[] | null;
  lawyer_reviewed:boolean;
  is_featured:    boolean;
  userHasAccess:  boolean;
  isPremium:      boolean;
}

const DOCUMENT_TYPE_EMOJI: Record<string, string> = {
  digital_asset_license: '🎨',
  commission_agreement:  '🤝',
  collaborator_split:    '🔀',
  nft_license:           '🪙',
  commercial:            '📄',
  default:               '📃',
};

export default function TemplateCard({ template }: { template: Template }) {
  const [purchasing, setPurchasing] = useState(false);

  const emoji = DOCUMENT_TYPE_EMOJI[template.document_type] ?? DOCUMENT_TYPE_EMOJI.default;
  const locked = template.isPremium && !template.userHasAccess;

  const handlePurchase = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPurchasing(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId:      'price_1TLG8gGt92XrRvUuGCjTHIqi',
          mode:         'payment',
          templateSlug: template.slug,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setPurchasing(false);
    }
  };

  return (
    <div className={`relative flex flex-col rounded-xl border ${
      template.is_featured ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'
    } bg-white overflow-hidden transition-shadow hover:shadow-md`}>

      {/* Featured badge */}
      {template.is_featured && (
        <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          FEATURED
        </div>
      )}

      {/* Header */}
      <div className={`px-4 pt-4 pb-3 ${locked ? 'opacity-75' : ''}`}>
        <div className="flex items-start gap-2">
          <span className="text-2xl flex-shrink-0">{emoji}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{template.name}</h3>
            {template.lawyer_reviewed && (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-700 font-medium mt-0.5">
                ⚖️ Lawyer-reviewed
              </span>
            )}
          </div>
        </div>
        {template.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{template.description}</p>
        )}
      </div>

      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer / CTA */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        {locked ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                🔒 Premium template
              </span>
              <span className="font-bold text-sm text-indigo-700">${template.priceDollars}</span>
            </div>
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full bg-indigo-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {purchasing ? 'Redirecting…' : `Unlock for $${template.priceDollars} →`}
            </button>
          </div>
        ) : template.isPremium ? (
          <div className="space-y-2">
            <span className="text-xs text-green-700 font-medium flex items-center gap-1">✅ Unlocked</span>
            <Link
              href={`/wizard?template=${template.slug}`}
              className="block w-full text-center bg-green-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Use Template →
            </Link>
          </div>
        ) : (
          <Link
            href={`/wizard?template=${template.slug}`}
            className="block w-full text-center bg-gray-800 text-white text-xs font-semibold py-2 rounded-lg hover:bg-gray-900 transition-colors"
          >
            Use Template →
          </Link>
        )}
      </div>
    </div>
  );
}
