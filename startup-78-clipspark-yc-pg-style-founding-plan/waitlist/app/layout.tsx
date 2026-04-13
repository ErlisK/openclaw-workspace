import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://clipspark.vercel.app";

export const metadata: Metadata = {
  title: "ClipSpark — Turn Your Podcast Into 10 Clips in 10 Minutes",
  description:
    "ClipSpark helps nano-creators repurpose long-form podcasts and videos into platform-ready short clips with AI timestamps, auto-captions, title suggestions, and one-click export to TikTok, Reels, Shorts, and LinkedIn. $5/month.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "ClipSpark — 10 Clips in 10 Minutes for $5/mo",
    description: "Stop spending hours on clips. ClipSpark turns your podcast into shareable shorts automatically. Join the waitlist — free early access.",
    type: "website",
    url: APP_URL,
    siteName: "ClipSpark",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ClipSpark — Turn Your Podcast Into 10 Clips in 10 Minutes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipSpark — 10 Clips in 10 Minutes for $5/mo",
    description: "Stop spending hours on clips. ClipSpark turns your podcast into shareable shorts automatically.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}
