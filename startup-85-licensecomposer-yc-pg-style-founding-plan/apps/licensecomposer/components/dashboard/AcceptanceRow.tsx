'use client';
/**
 * components/dashboard/AcceptanceRow.tsx
 */

interface Acceptance {
  id:             string;
  accepter_name:  string;
  accepter_email: string;
  accepted_at:    string;
  ip_address:     string | null;
  license_page_id: string | null;
}

interface Props {
  acceptance: Acceptance;
}

export default function AcceptanceRow({ acceptance }: Props) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{acceptance.accepter_name}</p>
        <p className="text-xs text-gray-400">{acceptance.accepter_email}</p>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-xs text-gray-600">
          {new Date(acceptance.accepted_at).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-gray-400 font-mono">{acceptance.ip_address ?? '—'}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-gray-300 font-mono">{acceptance.id.slice(0, 8)}…</span>
      </td>
    </tr>
  );
}
