import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlaytestFlow — Run Better Playtests. Ship Better Games.",
  description: "PlaytestFlow helps indie tabletop and RPG designers recruit, schedule, run, and analyze remote playtests with repeatable pipelines. Save 5+ hours per test cycle.",
  keywords: ["tabletop game design", "RPG playtesting", "remote playtest", "indie game designer", "playtest feedback"],
  openGraph: {
    title: "PlaytestFlow — Run Better Playtests. Ship Better Games.",
    description: "Replace messy Discord threads and scattered Google Forms with a trackable playtest pipeline. Built for indie tabletop and RPG designers.",
    url: "https://playtestflow.vercel.app",
    siteName: "PlaytestFlow",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaytestFlow — Run Better Playtests",
    description: "Structured remote playtest pipelines for indie tabletop and RPG designers. Save 5+ hours per test cycle.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
