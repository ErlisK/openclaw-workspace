import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — DocsCI",
  description: "DocsCI is building the docs-specific CI pipeline for API and SDK teams. Meet the team and learn our mission.",
  alternates: { canonical: "https://snippetci.com/about" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavBar />

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-2 text-indigo-400 text-sm font-medium tracking-wide uppercase">About</div>
        <h1 className="text-4xl font-bold text-white mb-4">We're building CI for docs</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-12">
          Every API team knows the pain: a release ships, a parameter changes, and three weeks later
          a support ticket arrives. The code example in the docs never ran after the refactor.
          DocsCI exists to make that impossible.
        </p>

        {/* Mission */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-12">
          <h2 className="text-white text-xl font-semibold mb-3">Mission</h2>
          <p className="text-gray-400 leading-relaxed">
            Eliminate broken documentation from the developer tooling ecosystem by making automated,
            verified docs a standard part of every release pipeline — the same way unit tests are
            today. Every code example should run. Every API reference should match the live API.
            Every developer who lands in your docs should have a frictionless path to success.
          </p>
        </div>

        {/* Why */}
        <div className="mb-12">
          <h2 className="text-white text-xl font-semibold mb-6">Why DocsCI exists</h2>
          <div className="space-y-4">
            {[
              {
                stat: "$47K",
                desc: "Average quarterly cost of a single broken code example, across developer time, support overhead, and early churn.",
              },
              {
                stat: "68%",
                desc: "Of developer support tickets at API-first companies trace back to docs that weren't updated with the release.",
              },
              {
                stat: "3 weeks",
                desc: "Median time from a breaking API change to a support ticket — long enough that the original author has moved on.",
              },
            ].map(({ stat, desc }) => (
              <div key={stat} className="flex gap-5 items-start border border-gray-800 rounded-xl p-5">
                <div className="text-3xl font-bold text-indigo-400 shrink-0 w-20">{stat}</div>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Product approach */}
        <div className="mb-12">
          <h2 className="text-white text-xl font-semibold mb-4">How we're different</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            General-purpose CI can run tests. DocsCI understands documentation structure: it knows
            what a code example is, what an API reference looks like, what a changelog entry means.
            That domain knowledge lets us catch things no generic linter ever could.
          </p>
          <p className="text-gray-400 leading-relaxed">
            Every snippet DocsCI executes, every drift signature it detects, and every failure
            pattern it identifies contributes to a proprietary corpus. Over time, that corpus
            enables predictive alerts and automated fixes — turning reactive docs maintenance into
            a proactive quality guarantee.
          </p>
        </div>

        {/* Team */}
        <div className="mb-12">
          <h2 className="text-white text-xl font-semibold mb-4">The team</h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            We're a small team of engineers who spent years at API-first companies watching docs
            drift, break, and frustrate developers. We left to build the tool we wished existed.
          </p>
          <p className="text-gray-400 leading-relaxed">
            DocsCI is based in San Francisco and backed by engineers who've shipped developer
            platforms at scale. We're building in public — follow along on{" "}
            <a
              href="https://github.com/docsci"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </div>

        {/* CTA */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-8 text-center">
          <h2 className="text-white text-xl font-semibold mb-2">Work with us</h2>
          <p className="text-indigo-300 text-sm mb-6">
            We're a small team that moves fast. If you care about developer experience and want to
            build tools that eliminate a real, measurable class of pain — we'd love to talk.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:hello@snippetci.com"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
            >
              Get in touch
            </a>
            <Link
              href="/pricing"
              className="border border-indigo-700 hover:border-indigo-500 text-indigo-300 font-medium px-6 py-3 rounded-lg transition-colors text-sm"
            >
              See pricing →
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-800 text-center py-8 text-gray-600 text-sm">
        <p>
          Questions?{" "}
          <a href="mailto:hello@snippetci.com" className="text-gray-400 hover:text-white transition-colors">
            hello@snippetci.com
          </a>
        </p>
      </footer>
    </div>
  );
}
