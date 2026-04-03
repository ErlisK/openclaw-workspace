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
