'use client';

export function CopyReferralButton({ referralUrl }: { referralUrl: string }) {
  return (
    <div className="flex items-center gap-2 bg-black/30 rounded-xl border border-white/10 px-4 py-2.5 font-mono text-sm text-violet-300 min-w-0">
      <span className="truncate">{referralUrl}</span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(referralUrl);
        }}
        className="ml-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-colors shrink-0"
      >
        Copy
      </button>
    </div>
  );
}
