import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusDo — Keyboard-first tasks",
  description: "Capture to completion in under 60 seconds. Keyboard-first todo app with 3-task Focus Mode.",
  keywords: ["todo", "tasks", "focus", "keyboard", "productivity"],
  openGraph: {
    title: "FocusDo",
    description: "Keyboard-first task management with Focus Mode",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
