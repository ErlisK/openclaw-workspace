import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Change Risk Radar – Know Before Vendor Changes Break Your Business",
  description:
    "SaaS that watches Stripe, Shopify, AWS, Google Workspace, and 25+ tools your company depends on—alerting you in plain English when a change creates operational, legal, pricing, or security risk.",
  keywords: [
    "vendor change monitoring", "SaaS change alerts", "stripe changes", "aws changelog alerts",
    "operational risk management", "vendor risk intelligence",
  ],
  openGraph: {
    title: "Change Risk Radar",
    description: "Know before vendor changes break your business.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main id="main-content">{children}</main>
        <footer>
          <div className="container">
            <p>© 2025 Change Risk Radar · Early Access · All deposits 100% refundable</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
