"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WaitlistForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          creator_type: creatorType,
          audience_size: audienceSize,
          notes,
          honeypot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        router.push("/thank-you");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto" noValidate>
      {/* Honeypot */}
      <div style={{ display: "none" }} aria-hidden="true">
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="creator_type" className="block text-sm font-medium text-gray-700 mb-1">
          I am a... <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <select
          id="creator_type"
          value={creatorType}
          onChange={(e) => setCreatorType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          disabled={loading}
        >
          <option value="">Select creator type</option>
          <option value="podcaster">Podcaster</option>
          <option value="livestreamer">Livestreamer</option>
          <option value="coach">Coach</option>
          <option value="founder">Founder</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="audience_size" className="block text-sm font-medium text-gray-700 mb-1">
          Audience size <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <select
          id="audience_size"
          value={audienceSize}
          onChange={(e) => setAudienceSize(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          disabled={loading}
        >
          <option value="">Select audience size</option>
          <option value="<1k">Under 1,000</option>
          <option value="1-5k">1,000 – 5,000</option>
          <option value="5-10k">5,000 – 10,000</option>
          <option value="10k+">10,000+</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Anything to share? <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What platforms do you publish to? Biggest pain point with repurposing content?"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Joining...
          </>
        ) : (
          "Join the Waitlist →"
        )}
      </button>
      <p className="text-xs text-gray-500 text-center">No spam. Unsubscribe anytime.</p>
    </form>
  );
}
