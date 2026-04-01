"use client";

/**
 * ErrorBoundary — catches client-side React render errors
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * Reports to Sentry (if configured) and analytics ring-buffer.
 * Renders a minimal recovery UI so the app stays usable.
 */

import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props   { children: ReactNode; fallback?: ReactNode; name?: string; }
interface State   { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentry (if configured)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: {
          componentStack: info.componentStack,
          boundary: this.props.name ?? "unknown",
        },
      });
    }

    // Analytics ring-buffer (always)
    import("@/lib/analytics").then(({ track }) => {
      track({
        event:   "error_caught",
        source:  "react_error_boundary" as const,
        message: error.message,
        stack:   error.stack,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }).catch(() => {});
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-2xl mb-4 opacity-30">⚠️</div>
        <p className="text-sm text-gray-500 mb-4">
          {this.props.name
            ? `The "${this.props.name}" component ran into an error.`
            : "Something went wrong in this section."}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="px-4 py-2 text-xs text-gray-500 border border-gray-800 rounded-lg
            hover:border-gray-700 hover:text-gray-300 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
}
