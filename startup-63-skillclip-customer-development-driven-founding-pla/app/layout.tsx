import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CertClip — Verified Credentials for Tradespeople",
  description:
    "Upload a 90-second work sample. Get jurisdiction-tagged micro-badges reviewed by vetted journeymen. Let employers find and trust you instantly.",
  metadataBase: new URL("https://certclip.com"),
  openGraph: {
    title: "CertClip — Verified Credentials for Tradespeople",
    description:
      "Stop losing jobs to paperwork delays. CertClip gives you a portable, verifiable skills portfolio that any employer can trust — anywhere.",
    url: "https://certclip.com",
    siteName: "CertClip",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CertClip — Trade Credential Marketplace",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CertClip — Verified Credentials for Tradespeople",
    description:
      "Upload a 90-second work sample. Get verified. Get hired faster.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
