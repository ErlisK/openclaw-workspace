export const dynamic = "force-dynamic";

import AuthCallbackClient from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <AuthCallbackClient />
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400">Signing you in…</p>
        <p className="text-xs text-gray-600 mt-2">You&apos;ll be redirected shortly.</p>
      </div>
    </div>
  );
}
