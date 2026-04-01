import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusDo — Daily Focus",
  description:
    "Keyboard-first task manager. Cap your day at 3 tasks, promote from your backlog, and get them done fast.",
  keywords: ["todo", "tasks", "focus", "keyboard", "productivity", "daily planning"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FocusDo",
  },
  openGraph: {
    title: "FocusDo — Daily Focus",
    description: "Cap your day at 3 tasks. Keyboard-first. Fast.",
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "FocusDo",
    description: "Keyboard-first task manager with 3-task Daily Focus Mode",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { color: "#0a0a0a",  media: "(prefers-color-scheme: dark)"  },
    { color: "#6ee7b7",  media: "(prefers-color-scheme: light)" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* PWA color for Safari/Chrome address bar */}
        <meta name="theme-color" content="#0a0a0a" />
        {/* iOS standalone hints */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FocusDo" />
        {/* Prevent tap delay on iOS */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="antialiased">
        {children}
        {/* PWA service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      reg.addEventListener('updatefound', function() {
                        // New SW found — reload once it activates for fresh cache
                        reg.installing && reg.installing.addEventListener('statechange', function(e) {
                          if (e.target.state === 'activated' && navigator.serviceWorker.controller) {
                            window.location.reload();
                          }
                        });
                      });
                    })
                    .catch(function(err) {
                      console.warn('[SW] Registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
