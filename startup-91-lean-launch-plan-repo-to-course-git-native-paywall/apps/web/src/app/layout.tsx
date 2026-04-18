import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'TeachRepo — Git-Native Course Platform',
    template: '%s | TeachRepo',
  },
  description:
    'Convert a GitHub repo or Markdown notes into a paywalled, versioned course site in minutes.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://teachrepo.com'),
  openGraph: {
    siteName: 'TeachRepo',
    url: 'https://teachrepo.com',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@teachrepo',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans antialiased">{children}</body>
    </html>
  );
}
