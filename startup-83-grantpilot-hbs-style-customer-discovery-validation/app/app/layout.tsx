import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/components/PostHogProvider";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pilotgrant.io";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "GrantPilot — AI Grant Writing for Nonprofits & Municipalities",
    template: "%s | GrantPilot",
  },
  description:
    "GrantPilot is an AI-assisted grant ops marketplace. Parse RFPs, generate funder-tailored narratives, build OMB-compliant budgets, populate SF-424 forms, and export submission packages — in hours, not weeks.",

  keywords: [
    "AI grant writing",
    "nonprofit grant software",
    "grant management software",
    "federal grant writing",
    "CDBG grant management",
    "SF-424 automation",
    "grant RFP parser",
    "grant budget builder",
    "OMB budget justification",
    "grant writing software nonprofits",
    "municipal grant coordinator",
  ],

  authors: [{ name: "GrantPilot", url: BASE_URL }],
  creator: "GrantPilot",
  publisher: "GrantPilot",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "GrantPilot",
    title: "GrantPilot — AI Grant Writing for Nonprofits & Municipalities",
    description:
      "Parse RFPs, generate funder-tailored narratives, build OMB-compliant budgets, and export submission-ready packages. Paired with vetted grant specialists.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "GrantPilot — AI Grant Ops Marketplace",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "GrantPilot — AI Grant Writing for Nonprofits",
    description:
      "AI-powered grant ops: parse RFPs, draft narratives, build budgets, populate SF-424 forms — in hours. Human QA gate on every application.",
    images: [`${BASE_URL}/og-image.png`],
    creator: "@grantpilot",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: BASE_URL,
  },

  verification: {
    // Add Google Search Console verification token here when available
    // google: "YOUR_VERIFICATION_TOKEN",
  },
};

// ─── Schema.org structured data ──────────────────────────────────────────────
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GrantPilot",
  url: BASE_URL,
  description:
    "AI-assisted grant operations marketplace for nonprofits and municipalities. Automates RFP parsing, narrative generation, budget building, SF-424 form population, and submission package export.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "0",
    highPrice: "299",
    offerCount: "3",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: "1 RFP parse, 1 narrative generation",
      },
      {
        "@type": "Offer",
        name: "Deliverable Pack",
        price: "149",
        priceCurrency: "USD",
        description: "5 RFP parses, 10 narrative generations, 5 exports",
      },
      {
        "@type": "Offer",
        name: "Pipeline Pro",
        price: "299",
        priceCurrency: "USD",
        description: "Unlimited RFP parses, narratives, and exports. Team collaboration.",
      },
    ],
  },
  featureList: [
    "AI RFP parsing",
    "Funder-tailored narrative generation",
    "OMB-compliant budget builder",
    "SF-424 and SF-424A form population",
    "Compliance checklist generation",
    "Submission package ZIP export",
    "Human QA gate",
    "Deadline timeline management",
    "Audit trail",
  ],
  screenshot: `${BASE_URL}/og-image.png`,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "24",
    bestRating: "5",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GrantPilot",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description: "AI-assisted grant operations marketplace for nonprofits and municipalities.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@pilotgrant.io",
    contactType: "customer support",
  },
  sameAs: [
    "https://twitter.com/grantpilot",
    "https://www.linkedin.com/company/grantpilot",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Schema.org: SoftwareApplication */}
        <Script
          id="schema-software-app"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
          strategy="beforeInteractive"
        />
        {/* Schema.org: Organization */}
        <Script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
