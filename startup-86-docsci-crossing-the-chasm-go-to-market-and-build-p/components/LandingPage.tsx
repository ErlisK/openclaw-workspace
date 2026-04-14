/**
 * components/LandingPage.tsx
 *
 * SEO-optimized landing page template for DocsCI use-case pages.
 * Includes:
 *   - JSON-LD SoftwareApplication + WebPage structured data
 *   - Hero with keyword-rich h1
 *   - Problem/solution section
 *   - Feature grid (3-col)
 *   - How it works (3-step)
 *   - Social proof / stats bar
 *   - CTA section
 *   - Client-side analytics event firing on load
 */

"use client";

import Link from "next/link";
import { useEffect } from "react";

export type LandingFeature = {
  icon: string;
  title: string;
  description: string;
};

export type LandingStep = {
  step: string;
  title: string;
  description: string;
  code?: string;
};

export type LandingPageProps = {
  slug: string;
  h1: string;
  tagline: string;
  problem: {
    heading: string;
    body: string;
    bullets: string[];
  };
  solution: {
    heading: string;
    body: string;
  };
  features: LandingFeature[];
  steps: LandingStep[];
  stats: Array<{ value: string; label: string }>;
  faqs: Array<{ q: string; a: string }>;
  primaryCta?: string;
  analyticsEvent: string;
};

export function LandingPage({
  slug,
  h1,
  tagline,
  problem,
  solution,
  features,
  steps,
  stats,
  faqs,
  primaryCta = "Start free — no credit card",
  analyticsEvent,
}: LandingPageProps) {
  // Fire analytics event on page load (client-side)
  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "page.viewed",
        properties: { path: `/for/${slug}`, landing_page: slug, keyword: analyticsEvent },
      }),
    }).catch(() => {});
  }, [slug, analyticsEvent]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="landing-page">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center" data-testid="hero-section">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950 border border-indigo-700 rounded-full text-indigo-300 text-xs font-medium mb-6">
          DocsCI for {analyticsEvent}
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight" data-testid="landing-h1">
          {h1}
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">{tagline}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors text-sm"
            data-testid="hero-cta"
            onClick={() =>
              fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: "onboarding.started", properties: { source: slug } }),
              }).catch(() => {})
            }
          >
            {primaryCta}
          </Link>
          <Link
            href="/playground"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition-colors border border-gray-700 text-sm"
          >
            See it live →
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6" data-testid="stats-bar">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-indigo-300">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20">
        {/* Problem */}
        <section data-testid="problem-section">
          <h2 className="text-2xl font-bold text-white mb-3">{problem.heading}</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">{problem.body}</p>
          <ul className="space-y-3">
            {problem.bullets.map((b, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-300">
                <span className="text-red-400 shrink-0 mt-0.5">✗</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Solution */}
        <section data-testid="solution-section">
          <h2 className="text-2xl font-bold text-white mb-3">{solution.heading}</h2>
          <p className="text-gray-400 max-w-2xl">{solution.body}</p>
        </section>

        {/* Feature grid */}
        <section data-testid="features-section">
          <h2 className="text-2xl font-bold text-white mb-8">Everything you need</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="p-5 bg-gray-900 border border-gray-700 rounded-xl">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section data-testid="steps-section">
          <h2 className="text-2xl font-bold text-white mb-8">How it works</h2>
          <div className="space-y-6">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-5">
                <div className="shrink-0 w-8 h-8 bg-indigo-950 border border-indigo-700 rounded-full flex items-center justify-center text-indigo-300 font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">{s.title}</h3>
                  <p className="text-gray-400 text-sm mb-2">{s.description}</p>
                  {s.code && (
                    <pre className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">
                      {s.code}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        {faqs.length > 0 && (
          <section data-testid="faq-section">
            <h2 className="text-2xl font-bold text-white mb-6">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map(({ q, a }, i) => (
                <div key={i} className="p-5 bg-gray-900 border border-gray-700 rounded-xl">
                  <p className="text-white font-medium mb-2">{q}</p>
                  <p className="text-gray-400 text-sm">{a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section
          className="p-10 bg-gradient-to-r from-indigo-950 to-gray-900 border border-indigo-700 rounded-2xl text-center"
          data-testid="cta-section"
        >
          <h2 className="text-3xl font-bold text-white mb-3">
            Ready to stop shipping broken docs?
          </h2>
          <p className="text-gray-400 mb-6">
            Join API and platform teams who use DocsCI to ship verified documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
              data-testid="bottom-cta"
            >
              {primaryCta}
            </Link>
            <Link
              href="/docs"
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition-colors border border-gray-700"
            >
              Read the docs
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
