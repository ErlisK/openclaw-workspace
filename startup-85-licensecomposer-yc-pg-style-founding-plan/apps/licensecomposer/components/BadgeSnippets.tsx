'use client';
/**
 * components/BadgeSnippets.tsx
 * Shows all embeddable badge/link formats for a license page.
 * Used in the PublishButton result and the hosted license page sidebar.
 */

import { useState } from 'react';

interface Snippets {
  license_url: string;
  badge_url:   string;
  widget_url:  string;
  html:        string;
  script_shield: string;
  script_pill:   string;
  script_minimal: string;
  markdown:    string;
  bbcode:      string;
  rst:         string;
  plain:       string;
  html_full:   string;
}

type TabKey = 'script' | 'html' | 'markdown' | 'bbcode' | 'plain';

const TABS: { key: TabKey; label: string; desc: string }[] = [
  { key: 'script',   label: '⚡ Script',   desc: 'Auto-injects badge (any HTML page)' },
  { key: 'html',     label: '🏷 HTML',     desc: 'Static badge image + link' },
  { key: 'markdown', label: '📝 Markdown', desc: 'GitHub, Notion, README' },
  { key: 'bbcode',   label: '💬 BBCode',   desc: 'itch.io, forums, Gumroad' },
  { key: 'plain',    label: '🔗 Plain URL', desc: 'Any description field' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="flex-shrink-0 text-xs bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function BadgeSnippets({ slug }: { slug: string }) {
  const [tab, setTab] = useState<TabKey>('script');
  const [scriptStyle, setScriptStyle] = useState<'shield' | 'pill' | 'minimal'>('shield');

  const APP_URL = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://pacttailor.com';

  const licenseUrl = `${APP_URL}/l/${slug}`;
  const badgeUrl   = `${APP_URL}/api/badge/${slug}`;

  const snippetMap: Record<TabKey, string> = {
    script:   `<script src="${APP_URL}/api/badge/${slug}/widget?style=${scriptStyle}" async></script>`,
    html:     `<a href="${licenseUrl}" target="_blank" rel="noopener noreferrer license" hreflang="en">\n  <img src="${badgeUrl}" alt="Verified License · PactTailor" width="188" height="20"/>\n</a>`,
    markdown: `[![Verified License · PactTailor](${badgeUrl})](${licenseUrl})`,
    bbcode:   `[url=${licenseUrl}][img]${badgeUrl}[/img][/url]`,
    plain:    `Licensed via PactTailor: ${licenseUrl}`,
  };

  const currentSnippet = snippetMap[tab];
  const currentDesc    = TABS.find(t => t.key === tab)?.desc ?? '';

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              tab === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">{currentDesc}</p>

      {/* Script style selector */}
      {tab === 'script' && (
        <div className="flex gap-2">
          {(['shield', 'pill', 'minimal'] as const).map(s => (
            <button
              key={s}
              onClick={() => setScriptStyle(s)}
              className={`text-xs px-2 py-1 rounded border transition-colors capitalize ${
                scriptStyle === s
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Code block + copy */}
      <div className="flex items-start gap-2">
        <pre className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-gray-700 font-mono">
          {currentSnippet}
        </pre>
        <CopyButton text={currentSnippet} />
      </div>

      {/* Preview for HTML/script/markdown */}
      {(tab === 'html' || tab === 'script') && (
        <div className="border border-dashed border-gray-200 rounded-lg p-3 flex items-center gap-3">
          <span className="text-xs text-gray-400">Preview:</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href={licenseUrl} target="_blank" rel="noopener noreferrer license">
            <img src={badgeUrl} alt="Verified License · PactTailor" width={188} height={20} />
          </a>
        </div>
      )}

      {/* Direct links */}
      <div className="flex flex-wrap gap-2 pt-1">
        <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">
          Open license page →
        </a>
        <span className="text-gray-300">|</span>
        <a href={`/api/badge/${slug}/snippet`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:underline">
          All snippets (JSON) →
        </a>
      </div>
    </div>
  );
}
