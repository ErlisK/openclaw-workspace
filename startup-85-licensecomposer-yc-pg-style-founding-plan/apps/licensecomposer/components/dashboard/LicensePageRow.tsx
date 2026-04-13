'use client';
/**
 * components/dashboard/LicensePageRow.tsx
 */

import Link from 'next/link';

interface LicensePage {
  id:                   string;
  slug:                 string;
  title:                string;
  is_active:            boolean;
  badge_enabled:        boolean;
  view_count:           number;
  created_at:           string;
  contract_document_id: string | null;
}

interface Props {
  page:             LicensePage;
  acceptanceCount:  number;
  appUrl:           string;
}

export default function LicensePageRow({ page, acceptanceCount, appUrl }: Props) {
  const publicUrl = `${appUrl}/l/${page.slug}`;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 text-sm">{page.title}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">/l/{page.slug}</p>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-sm text-gray-700">{page.view_count ?? 0}</span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm text-gray-700">{acceptanceCount}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          page.is_active
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {page.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
          >
            Open →
          </a>
          <a
            href={`/api/badge/${page.slug}/snippet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
          >
            🏷 Snippets
          </a>
          {page.contract_document_id && (
            <Link
              href={`/contracts/${page.contract_document_id}`}
              className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
            >
              Contract
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}
