"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

type Role = "tradesperson" | "employer" | "staffing" | "mentor";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { setError("Please select your role"); return; }
    setLoading(true);
    setError("");

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile/setup`,
        data: { role },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile row
      await supabase.from("profiles").insert({
        user_id: data.user.id,
        email,
        role,
        onboarding_completed: false,
      });
    }

    setDone(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-white">
            Cert<span className="text-yellow-400">Clip</span>
          </Link>
          <p className="text-gray-400 mt-2">Create your free account</p>
        </div>

        {done ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-3">🎉</div>
            <h2 className="text-lg font-bold mb-2">Check your email</h2>
            <p className="text-gray-400 text-sm">We sent a confirmation to <strong>{email}</strong>. Click the link to activate your account and set up your profile.</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Role picker */}
              <div>
                <label className="block text-sm font-medium mb-2">I am a <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "tradesperson", icon: "🔧", label: "Tradesperson" },
                    { v: "employer",     icon: "🏗️", label: "Employer / GC" },
                    { v: "staffing",     icon: "🏢", label: "Staffing Firm" },
                    { v: "mentor",       icon: "👷", label: "Mentor / Reviewer" },
                  ] as {v: Role; icon: string; label: string}[]).map((opt) => (
                    <button key={opt.v} type="button"
                      onClick={() => setRole(opt.v)}
                      className={`py-3 px-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${
                        role === opt.v ? "bg-yellow-400 border-yellow-400 text-black" : "bg-white/5 border-white/20 text-gray-300 hover:border-white/40"
                      }`}>
                      <span>{opt.icon}</span><span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Email <span className="text-red-400">*</span></label>
                <input type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password <span className="text-red-400">*</span></label>
                <input type="password" required minLength={8} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors" />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={loading || !role}
                className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors">
                {loading ? "Creating account..." : "Create Account →"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-yellow-400 hover:underline">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
