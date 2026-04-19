import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'TeachRepo — the Git-native course platform built by engineers, for engineers.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About TeachRepo</h1>
        <p className="text-lg text-gray-600 mb-8">
          TeachRepo is a Git-native course platform built by engineers who were tired of
          wrestling with clunky CMS tools just to share what they know.
        </p>
        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Our Mission</h2>
        <p className="text-gray-600">
          Make it trivial for engineers and technical creators to turn their GitHub repos,
          docs, and Markdown notes into paywalled, versioned mini-courses — without leaving
          their code-first workflow.
        </p>
        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Why TeachRepo?</h2>
        <ul className="space-y-3 text-gray-600 list-none">
          <li><strong>Code-first:</strong> Author in Markdown + YAML, commit to Git, deploy automatically.</li>
          <li><strong>Own your content:</strong> Self-host the open-source core. No lock-in.</li>
          <li><strong>Built-in monetization:</strong> Stripe/Gumroad checkout, affiliate tracking, and a hosted marketplace.</li>
          <li><strong>Smart learning tools:</strong> Auto-graded quizzes, embeddable code sandboxes, progress tracking.</li>
        </ul>
        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Contact</h2>
        <p className="text-gray-600">
          Reach us at{' '}
          <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
            hello@teachrepo.com
          </a>
          {' '}or open an issue on{' '}
          <a
            href="https://github.com/ErlisK/openclaw-workspace"
            className="text-violet-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>.
        </p>
      </div>
    </div>
  );
}
