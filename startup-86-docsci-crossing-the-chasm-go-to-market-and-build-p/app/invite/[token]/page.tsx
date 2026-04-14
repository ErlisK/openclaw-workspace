/**
 * /invite/[token] — Invite acceptance page
 * Shows org name + role, and a "Join" button.
 * Calls POST /api/invite to accept.
 */
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type InvitePreview = {
  valid: boolean;
  expired: boolean;
  exhausted: boolean;
  role: "owner" | "editor" | "viewer";
  org: { id: string; name: string; slug: string } | null;
  label: string | null;
};

const ROLE_DESC: Record<string, string> = {
  owner: "Full access: trigger runs, manage members, billing",
  editor: "Can trigger CI runs and manage projects",
  viewer: "Read-only: view findings and run history",
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setPreview(data);
      })
      .catch(() => setError("Failed to load invite"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setJoining(false);
    if (!res.ok) {
      if (res.status === 401) {
        router.push(`/login?redirect=/invite/${token}`);
        return;
      }
      setError(data.error ?? "Failed to join");
      return;
    }
    if (data.already_member) {
      setJoined(true);
      setTimeout(() => router.push("/dashboard"), 1500);
      return;
    }
    setJoined(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 animate-pulse">Checking invite…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4" data-testid="invite-page">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
          {/* Brand */}
          <div className="text-3xl mb-2">📄</div>
          <h1 className="text-xl font-bold text-white mb-1">DocsCI</h1>
          <p className="text-gray-500 text-sm mb-6">snippetci.com</p>

          {joined ? (
            <div data-testid="invite-joined">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-green-400 font-semibold text-lg mb-1">You&apos;re in!</p>
              <p className="text-gray-400 text-sm">Redirecting to dashboard…</p>
            </div>
          ) : error && !preview ? (
            <div data-testid="invite-invalid">
              <div className="text-4xl mb-3">❌</div>
              <p className="text-red-400 font-semibold mb-2">Invalid invite</p>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <Link href="/dashboard" className="text-indigo-400 underline text-sm">
                Go to dashboard
              </Link>
            </div>
          ) : preview && (!preview.valid || preview.expired || preview.exhausted) ? (
            <div data-testid="invite-expired">
              <div className="text-4xl mb-3">⏰</div>
              <p className="text-yellow-400 font-semibold mb-2">
                {preview.expired ? "Invite expired" : "Invite exhausted"}
              </p>
              <p className="text-gray-500 text-sm mb-6">
                {preview.expired
                  ? "This invite link has expired. Ask an owner to generate a new one."
                  : "This invite link has reached its maximum uses."}
              </p>
              <Link href="/dashboard" className="text-indigo-400 underline text-sm">
                Go to dashboard
              </Link>
            </div>
          ) : preview ? (
            <div data-testid="invite-valid">
              <p className="text-gray-400 text-sm mb-2">You&apos;re invited to join</p>
              <p className="text-2xl font-bold text-white mb-1">{preview.org?.name}</p>
              {preview.label && (
                <p className="text-gray-500 text-sm mb-2">{preview.label}</p>
              )}
              <div className="my-4 p-3 bg-gray-800 rounded-lg text-left">
                <p className="text-xs text-gray-500 mb-1">Your role</p>
                <p className="text-white font-medium capitalize">{preview.role}</p>
                <p className="text-xs text-gray-400 mt-1">{ROLE_DESC[preview.role]}</p>
              </div>
              {error && (
                <p className="text-red-400 text-sm mb-3" data-testid="invite-error">{error}</p>
              )}
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                data-testid="join-org-btn"
              >
                {joining ? "Joining…" : `Join ${preview.org?.name}`}
              </button>
              <p className="text-xs text-gray-600 mt-3">
                By joining, you agree to the{" "}
                <Link href="/terms" className="underline">terms</Link>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
