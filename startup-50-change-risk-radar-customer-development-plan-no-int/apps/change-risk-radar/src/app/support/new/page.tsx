"use client";
import { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { id: "general", label: "General Question" },
  { id: "billing", label: "Billing / Payments" },
  { id: "connector", label: "Connector Issue" },
  { id: "alert", label: "Alert Question" },
  { id: "security", label: "Security / Privacy" },
  { id: "feature_request", label: "Feature Request" },
  { id: "bug", label: "Bug Report" },
  { id: "incident", label: "Incident Report" },
];

export default async function NewTicketPage(props: {
  searchParams: Promise<{ category?: string; subject?: string; token?: string }>;
}) {
  const searchParams = await props.searchParams;
  return <NewTicketForm defaultCategory={searchParams.category} defaultSubject={searchParams.subject} token={searchParams.token} />;
}

function NewTicketForm({
  defaultCategory,
  defaultSubject,
  token,
}: {
  defaultCategory?: string;
  defaultSubject?: string;
  token?: string;
}) {
  const [form, setForm] = useState({
    reporter_email: "",
    reporter_name: "",
    category: defaultCategory ?? "general",
    priority: "normal",
    subject: defaultSubject ?? "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ticket_number?: string; id?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit ticket");
      setResult(data.ticket);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket Submitted</h1>
          <p className="text-gray-600 mb-2">
            Your ticket <strong>{result.ticket_number}</strong> has been received.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;ve sent a confirmation to your email. Our team responds within 4 business hours.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/support/${result.id}`}
              className="block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Track Your Ticket
            </Link>
            <Link
              href="/help"
              className="block px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:border-indigo-300 transition-colors"
            >
              Browse Help Articles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/help" className="hover:text-indigo-600">Help Center</Link>
            <span>›</span>
            <span className="text-gray-800">New Support Ticket</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Contact Support</h1>
          <p className="text-gray-600 mt-2">
            We typically respond within 4 business hours. For urgent issues, set priority to &quot;Urgent&quot;.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Email *
              </label>
              <input
                type="email"
                required
                value={form.reporter_email}
                onChange={e => setForm(f => ({ ...f, reporter_email: e.target.value }))}
                placeholder="you@company.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={form.reporter_name}
                onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent — active outage</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Brief description of the issue"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              rows={6}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Please describe the issue in detail. Include any error messages, steps to reproduce, and what you expected to happen."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              By submitting, you agree to our{" "}
              <Link href="/legal/privacy" className="hover:text-indigo-600">Privacy Policy</Link>.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Ticket"}
            </button>
          </div>
        </form>

        {/* Quick help links */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { href: "/help/connect-stripe", label: "Stripe connector" },
            { href: "/help/billing-and-plans", label: "Billing help" },
            { href: "/status", label: "System status" },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-center text-sm bg-white border border-gray-200 rounded-lg py-3 px-4 text-indigo-600 hover:border-indigo-300 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
