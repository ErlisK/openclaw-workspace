import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocsCI – Docs-Specific CI for API & SDK Teams",
  description: "Eliminate broken examples, detect API drift, and keep docs in lockstep with releases.",
  metadataBase: new URL('https://snippetci.com'),
  openGraph: {
    title: "DocsCI",
    description: "Docs-specific CI pipeline for API/SDK platform teams",
    url: "https://snippetci.com",
    siteName: "DocsCI",
    images: [{ url: '/og', width: 1200, height: 630, alt: 'DocsCI' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "DocsCI – Docs-Specific CI for API & SDK Teams",
    description: "Eliminate broken examples, detect API drift, and keep docs in lockstep with releases.",
    images: ['https://snippetci.com/og'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 font-sans antialiased">{children}</body>
    </html>
  );
}
