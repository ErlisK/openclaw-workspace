/**
 * app/l/[slug]/not-found.tsx
 * Renders when notFound() is called for a non-existent license page slug.
 * Presence of this file ensures Next.js returns HTTP 404 (not 200).
 */
import Link from 'next/link';

export default function LicenseNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📄</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">License Not Found</h1>
        <p className="text-gray-600 mb-6">
          This license page doesn&apos;t exist or has been removed.
          If you followed a link, the creator may have deleted or unpublished this license.
        </p>
        <Link
          href="/"
          className="inline-block bg-indigo-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Go to PactTailor →
        </Link>
      </div>
    </div>
  );
}
