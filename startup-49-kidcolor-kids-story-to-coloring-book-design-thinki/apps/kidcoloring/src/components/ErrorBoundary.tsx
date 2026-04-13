'use client'
/**
 * ErrorBoundary.tsx
 *
 * React error boundary that:
 *   1. Catches render errors and shows a kid-friendly fallback UI
 *   2. Beacons the error to /api/v1/log-error for observability
 *   3. Provides a "Try again" button to recover
 *
 * Usage:
 *   <ErrorBoundary route="/create/preview">
 *     <YourComponent />
 *   </ErrorBoundary>
 */
import { Component, type ReactNode } from 'react'

interface Props {
  children:  ReactNode
  route?:    string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  errorId?:  string
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true, errorId: Math.random().toString(36).slice(2, 9) }
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    const sessionId = typeof window !== 'undefined'
      ? (window.localStorage.getItem('kc_session_id') ?? undefined)
      : undefined

    // Fire-and-forget beacon to server
    void fetch('/api/v1/log-error', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:    error.message,
        stack:      (error.stack ?? '') + '\n\nComponent stack:\n' + info.componentStack,
        route:      this.props.route ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
        sessionId,
        severity:   'error',
        properties: { errorId: this.state.errorId },
      }),
    }).catch(() => {})
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
        <p className="text-4xl mb-3">🎨</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-sm">
          Our crayons got a bit tangled. Don&apos;t worry — your coloring book progress is safe.
        </p>
        <button
          onClick={() => {
            this.setState({ hasError: false, errorId: undefined })
            window.location.reload()
          }}
          className="bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl
                     hover:bg-violet-700 transition-colors text-sm"
        >
          Try again
        </button>
        {this.state.errorId && (
          <p className="text-xs text-gray-300 mt-3">Error ID: {this.state.errorId}</p>
        )}
      </div>
    )
  }
}
