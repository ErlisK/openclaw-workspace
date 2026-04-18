import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import Script from "next/script";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://giganalytics.app").replace(/\/$/, "");
const APP_TITLE = "GigAnalytics — ROI Dashboard for Multi-Income Freelancers";
const APP_DESC =
  "Turn raw Stripe, PayPal, and CSV payments into true hourly rates, acquisition ROI, A/B pricing experiments, and earnings heatmaps. Built for people juggling 2–5 income streams.";
const OG_IMAGE = `${APP_URL}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_TITLE,
    template: "%s | GigAnalytics",
  },
  description: APP_DESC,
  keywords: [
    "freelance analytics",
    "side income ROI",
    "true hourly rate",
    "gig economy dashboard",
    "Stripe analytics",
    "PayPal income tracker",
    "Upwork ROI",
    "freelancer earnings",
    "income stream tracker",
    "pricing experiments",
  ],
  authors: [{ name: "GigAnalytics" }],
  creator: "GigAnalytics",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "GigAnalytics",
    title: APP_TITLE,
    description: APP_DESC,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "GigAnalytics — Know your real hourly rate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESC,
    images: [OG_IMAGE],
    creator: "@giganalytics",
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
  verification: {
    // Add Google Search Console / Bing when available
    // google: 'GOOGLE_VERIFICATION_TOKEN',
  },
};

// schema.org SoftwareApplication structured data
const schemaOrg = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GigAnalytics",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: APP_DESC,
  url: APP_URL.trim(),
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      name: "Free Plan",
      description: "CSV import, timer, ROI dashboard, heatmap",
    },
    {
      "@type": "Offer",
      price: "29",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "29",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
      name: "Pro Plan",
      description: "AI insights, pricing experiments, benchmark access",
    },
  ],
  featureList: [
    "True hourly rate calculation",
    "Stripe/PayPal/CSV import",
    "One-tap mobile timer",
    "Earnings heatmap",
    "A/B pricing experiments",
    "AI income insights",
    "Multi-stream ROI dashboard",
    "Anonymous rate benchmarks",
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
        <Script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <CookieConsent />
        {children}
      </body>
    </html>
  );
}
