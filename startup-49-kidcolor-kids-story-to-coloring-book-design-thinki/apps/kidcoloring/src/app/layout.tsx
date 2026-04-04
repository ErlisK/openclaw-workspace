import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",        // prevent FOIT on slow connections
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KidColoring – Turn Your Story Into a Coloring Book",
  description:
    "AI-powered personalized coloring books for kids. Enter your child's interests or story, get a unique printable coloring book in seconds.",
  keywords: [
    "kids coloring book",
    "AI coloring book generator",
    "personalized coloring pages",
    "custom coloring book for kids",
    "children activity book",
  ],
  openGraph: {
    title: "KidColoring – Personalized Coloring Books for Kids",
    description: "Turn any story or interest into a custom coloring book.",
    type: "website",
    locale: "en_US",
  },
};

// Separate viewport export (Next.js 14+)
export const viewport: Viewport = {
  // width=device-width ensures correct scaling on all devices
  // initial-scale=1 prevents iOS auto-zoom on input focus
  // viewport-fit=cover enables edge-to-edge on iPhone notch/Dynamic Island
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,   // allow user zoom up to 5× (WCAG 1.4.4 — do not set to 1)
  viewportFit: "cover",
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
        {/* Skip to main content — visible on keyboard focus, hidden otherwise */}
        {/* Allows keyboard/switch users to bypass repeated navigation */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {children}
      </body>
    </html>
  );
}
