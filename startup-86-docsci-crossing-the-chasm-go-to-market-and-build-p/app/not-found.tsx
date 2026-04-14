import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="text-8xl font-black text-indigo-500 mb-4">404</div>
        <div className="text-4xl mb-2">⚡</div>
        <h1 className="text-3xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-gray-400 mb-8">
          Looks like this page drifted out of sync. The URL you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
