import type { Metadata } from "next";
import { headers } from "next/headers";
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
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'DocsCI' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "DocsCI – Docs-Specific CI for API & SDK Teams",
    description: "Eliminate broken examples, detect API drift, and keep docs in lockstep with releases.",
    images: ['https://snippetci.com/opengraph-image'],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <html lang="en">
      <head>
        {nonce && (
          // Pass nonce to Next.js so it can attach to inline scripts
          // eslint-disable-next-line @next/next/no-head-element
          <meta name="x-nonce" content={nonce} />
        )}
      </head>
      <body className="bg-gray-950 text-gray-100 font-sans antialiased">{children}</body>
    </html>
  );
}
