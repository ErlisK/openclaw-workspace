import Link from "next/link";

export default function ThankYou() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        You&apos;re on the list!
      </h1>
      <p className="text-xl text-gray-600 mb-8 max-w-md">
        Thanks for joining the ClipSpark waitlist. We&apos;ll reach out when early
        access opens.
      </p>
      <p className="text-gray-500 mb-8">Tell a fellow creator about ClipSpark 👇</p>
      <div className="flex flex-wrap gap-4 justify-center mb-8">
        <a
          href="https://twitter.com/intent/tweet?text=Just+joined+the+ClipSpark+waitlist+%E2%80%94+AI+tool+to+turn+podcasts+into+short+clips+for+TikTok%2C+Reels+%26+more.+%245%2Fmo+for+nano-creators+%F0%9F%94%A5"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-sky-500 hover:bg-sky-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          Share on X
        </a>
        <a
          href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fclipspark.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          Share on LinkedIn
        </a>
      </div>
      <Link href="/" className="text-orange-500 hover:text-orange-600 text-sm">
        ← Back to homepage
      </Link>
    </main>
  );
}
