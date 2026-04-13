"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const TRADES = ["Electrician","Plumber","HVAC Technician","Welder","Carpenter","Pipefitter","Sheet Metal Worker","Ironworker","Elevator Mechanic","Fire Sprinkler Fitter","Other"];
const REGIONS = ["California","Texas","New York","Illinois","Florida","Washington","Colorado","Arizona","Georgia","Ohio","Ontario, Canada","British Columbia, Canada","Alberta, Canada","Other"];

export default function ProfileSetupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{id?: string; role?: string; email?: string} | null>(null);
  const [fullName, setFullName] = useState("");
  const [trade, setTrade] = useState("");
  const [region, setRegion] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setRegion(data.region_id ? "" : ""); // will resolve later
        setCompanyName(data.company_name || "");
        setBio(data.bio || "");
      } else {
        setProfile({ role: user.user_metadata?.role || "tradesperson", email: user.email });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates = {
      user_id: user.id,
      email: user.email,
      full_name: fullName,
      bio,
      phone: phone || null,
      company_name: companyName || null,
      company_size: companySize || null,
      years_experience: yearsExp ? parseInt(yearsExp) : null,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(updates, { onConflict: "user_id" });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  const role = profile?.role || "tradesperson";

  return (
    <div className="min-h-screen bg-[#0f1117] px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-black text-white">Cert<span className="text-yellow-400">Clip</span></a>
          <h1 className="text-2xl font-black mt-4 mb-1">Set up your profile</h1>
          <p className="text-gray-400 text-sm">This takes 2 minutes and helps employers find and trust you.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full name <span className="text-red-400">*</span></label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors" />
            </div>

            {(role === "tradesperson" || role === "mentor") && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Your trade</label>
                  <select value={trade} onChange={(e) => setTrade(e.target.value)}
                    className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400">
                    <option value="">Select trade...</option>
                    {TRADES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Years of experience</label>
                  <input type="number" min="0" max="50" value={yearsExp}
                    onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 8"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400" />
                </div>
              </>
            )}

            {(role === "employer" || role === "staffing") && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Company name</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ABC Electric Co."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Company size</label>
                  <select value={companySize} onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400">
                    <option value="">Select...</option>
                    <option>1–10</option><option>11–50</option><option>51–200</option><option>201–500</option><option>500+</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400">
                <option value="">Select region...</option>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Phone (optional)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                {role === "tradesperson" || role === "mentor" ? "Short bio" : "About your company"}
                <span className="text-gray-500 font-normal"> (optional)</span>
              </label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder={role === "tradesperson" ? "e.g. Licensed electrician with 10 years in commercial construction, NEC 2020, Title 24 experience..." : "e.g. Houston-based GC specializing in commercial electrical..."}
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none text-sm" />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={saving}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors">
              {saving ? "Saving..." : "Complete Setup →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
