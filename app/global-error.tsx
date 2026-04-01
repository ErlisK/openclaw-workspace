/**
 * app/global-error.tsx — Next.js 14 App Router top-level error boundary
 *
 * Caught by Next.js for RSC (server component) unhandled errors.
 * Reports to Sentry when DSN is configured; always shows branded fallback UI.
 *
 * NOTE: This is a CLIENT component by requirement.
 */
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface Props {
  error:  Error & { digest?: string };
  reset:  () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Only report if Sentry is configured (DSN present)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        background: "#0a0a0a",
        color:      "#e8e8e8",
        fontFamily: "system-ui, sans-serif",
        minHeight:  "100vh",
        display:    "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding:    "2rem",
        textAlign:  "center",
      }}>
        <div style={{ color: "#6ee7b7", fontWeight: 700, marginBottom: "1.5rem" }}>
          FocusDo
        </div>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.4 }}>
          ⚠️
        </div>
        <h1 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "2rem", maxWidth: "22rem" }}>
          An unexpected error occurred. Your tasks are saved locally.
          {error.digest && (
            <> Error ID: <code style={{ color: "#444" }}>{error.digest}</code></>
          )}
        </p>
        <button
          onClick={reset}
          style={{
            padding:      "0.625rem 1.5rem",
            border:       "1px solid #2a2a2a",
            borderRadius: "0.5rem",
            background:   "transparent",
            color:        "#aaa",
            fontSize:     "0.85rem",
            cursor:       "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
