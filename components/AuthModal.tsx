"use client";

import { useState } from "react";

interface AuthModalProps {
  onSendLink:  (email: string) => Promise<void>;
  onClose:     () => void;
  isLoading:   boolean;
  error:       string | null;
  isConfigured: boolean;
}

export function AuthModal({ onSendLink, onClose, isLoading, error, isConfigured }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [sent,  setSent]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await onSendLink(email.trim());
    setSent(true);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Sign in to sync</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Tasks sync across devices when signed in
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-300 text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-white/5"
          >
            ×
          </button>
        </div>

        {!isConfigured ? (
          /* Local-mode notice */
          <div className="text-center py-4">
            <div className="text-3xl mb-3">💾</div>
            <p className="text-sm text-gray-400 mb-1">Running in local mode</p>
            <p className="text-xs text-gray-600">
              Tasks are saved in this browser only.
              Configure Supabase to enable cross-device sync.
            </p>
          </div>
        ) : sent && !error ? (
          /* Sent state */
          <div className="text-center py-4">
            <div className="text-3xl mb-3">✉️</div>
            <p className="text-sm text-gray-200 mb-1">Magic link sent!</p>
            <p className="text-xs text-gray-500">Check your inbox and click the link.</p>
            <p className="text-xs text-gray-700 mt-3">{email}</p>
          </div>
        ) : (
          /* Email form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5" htmlFor="auth-email">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/30 disabled:cursor-not-allowed text-black text-sm font-medium transition-colors"
            >
              {isLoading ? "Sending…" : "Send magic link"}
            </button>

            <p className="text-xs text-gray-700 text-center">
              No password needed · works in any browser
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
