'use client';
/**
 * components/TrustBadge.tsx
 * Embeddable trust badge with link to /l/[slug] (hosted license page).
 * Includes "Powered by LicenseComposer" attribution.
 */
interface TrustBadgeProps {
  slug: string;
  licenseType?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TrustBadge({ slug, licenseType, size = 'md', className = '' }: TrustBadgeProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';
  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  }[size];

  return (
    <a
      href={`${appUrl}/l/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      title="View verified license on PactTailor — Powered by LicenseComposer"
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow hover:shadow-md transition ${sizeClasses} ${className}`}
    >
      <svg
        className="shrink-0"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>
        {licenseType ? `Licensed via PactTailor · ${licenseType}` : 'Licensed via PactTailor'}
      </span>
    </a>
  );
}
