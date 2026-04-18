export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <div className="max-w-3xl">
        <div className="mb-6 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          🚀 Now in beta — <a href="#" className="ml-1 underline">Get early access</a>
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Turn your{' '}
          <span className="text-indigo-600">GitHub repo</span>
          {' '}into a paywalled course
        </h1>

        <p className="mb-10 text-xl text-gray-600">
          Write lessons in Markdown. Define quizzes in YAML frontmatter. Deploy with{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-base">git push</code>.
          Accept payments with Stripe. Done in under 15 minutes.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/dashboard/new"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Start for free →
          </a>
          <a
            href="https://github.com/ErlisK/openclaw-workspace"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            View on GitHub
          </a>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Self-hostable · Free tier · No lock-in · Contact:{' '}
          <a href="mailto:hello@teachrepo.com" className="underline">
            hello@teachrepo.com
          </a>
        </p>
      </div>
    </main>
  );
}
