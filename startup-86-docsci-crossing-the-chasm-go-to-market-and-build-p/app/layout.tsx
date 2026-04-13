import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocsCI – Docs-Specific CI for API & SDK Teams",
  description: "Eliminate broken examples, detect API drift, and keep docs in lockstep with releases.",
  openGraph: {
    title: "DocsCI",
    description: "Docs-specific CI pipeline for API/SDK platform teams",
    url: "https://snippetci.com",
    siteName: "DocsCI",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 font-sans antialiased">{children}</body>
    </html>
  );
}
