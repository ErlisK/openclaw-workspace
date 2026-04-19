import type { Metadata } from 'next';
import './globals.css';
import { getBaseUrl } from '@/utils/url';

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  title: {
    default: 'TeachRepo — Git-Native Course Platform',
    template: '%s | TeachRepo',
  },
  description:
    'Convert a GitHub repo or Markdown notes into a paywalled, versioned course site in minutes. Git-native, one-click deploy, built for engineers.',
  metadataBase: new URL(BASE_URL),
  keywords: [
    'course platform', 'git native', 'markdown courses', 'paywalled content',
    'developer education', 'self-hosted course', 'teachrepo',
  ],
  authors: [{ name: 'TeachRepo', url: BASE_URL }],
  creator: 'TeachRepo',
  publisher: 'TeachRepo',
  robots: { index: true, follow: true },
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: 'website',
    siteName: 'TeachRepo',
    url: BASE_URL,
    title: 'TeachRepo — Git-Native Course Platform',
    description: 'Convert a GitHub repo into a paywalled course site in minutes.',
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'TeachRepo' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@teachrepo',
    creator: '@teachrepo',
    title: 'TeachRepo — Git-Native Course Platform',
    description: 'Convert a GitHub repo into a paywalled course site in minutes.',
    images: [`${BASE_URL}/og-image.png`],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans antialiased">{children}</body>
    </html>
  );
}
