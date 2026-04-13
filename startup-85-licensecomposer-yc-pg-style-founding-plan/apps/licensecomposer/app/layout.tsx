import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from 'react';
import { headers } from 'next/headers';
import PostHogProvider from '@/components/PostHogProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PactTailor — Plain-English Contracts for Indie Creators",
    template: "%s | PactTailor",
  },
  description: "Generate plain-English, ready-to-sign contracts in under 2 minutes. Commission agreements, asset licenses, and collaborator splits for indie creators.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com'),
  openGraph: {
    siteName: "PactTailor",
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com',
    images: ['/og-card.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-card.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Set __webpack_nonce__ before Next.js scripts so they receive nonce from CSP */}
        {nonce && (
          <script
            nonce={nonce}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: `self.__webpack_nonce__='${nonce}'` }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
