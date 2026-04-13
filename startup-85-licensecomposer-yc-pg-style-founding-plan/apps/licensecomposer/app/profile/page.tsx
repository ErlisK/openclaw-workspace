/**
 * app/profile/page.tsx
 * User profile page — view/edit display name, bio, jurisdiction preference, plan status, logout.
 */
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getProfile, updateProfile } from '@/app/actions/profile';
import { signOut } from '@/app/actions/auth';
import { JURISDICTION_OPTIONS } from '@/lib/jurisdiction';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Your profile | PactTailor' };

const CREATOR_TYPES = [
  { value: 'game_dev',       label: '🎮 Game developer' },
  { value: 'digital_artist', label: '🎨 Digital artist / illustrator' },
  { value: 'musician',       label: '🎵 Musician / composer' },
  { value: '3d_artist',      label: '⬡ 3D artist / modeller' },
  { value: 'font_designer',  label: '🔤 Font / type designer' },
  { value: 'photographer',   label: '📷 Photographer / stock creator' },
  { value: 'writer',         label: '✍️ Writer / narrative designer' },
  { value: 'nft_creator',    label: '🔗 NFT / digital collectible creator' },
  { value: 'other',          label: '💡 Other indie creator' },
];

const PLAN_LABELS: Record<string, { label: string; colour: string; desc: string }> = {
  free:     { label: 'Free',     colour: 'bg-gray-100 text-gray-700',   desc: 'Up to 3 exports/month' },
  pro:      { label: 'Pro',      colour: 'bg-indigo-100 text-indigo-700', desc: 'Unlimited exports · $9/year' },
  lifetime: { label: 'Lifetime', colour: 'bg-purple-100 text-purple-700', desc: 'Unlimited exports · one-time' },
};

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const plan = PLAN_LABELS[profile.plan] ?? PLAN_LABELS['free'];
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900">PactTailor</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
          <form action={signOut}>
            <button type="submit"
              className="text-gray-500 hover:text-red-600 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Member since {memberSince} ·{' '}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${plan.colour}`}>
              {plan.label}
            </span>
            {' '}— {plan.desc}
          </p>
        </div>

        {/* Plan upgrade CTA (free users only) */}
        {profile.plan === 'free' && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 flex items-start gap-4">
            <span className="text-2xl mt-0.5">🚀</span>
            <div>
              <p className="text-sm font-semibold text-indigo-900">Upgrade to Pro — $9/year</p>
              <p className="text-sm text-indigo-700 mt-0.5">
                Unlimited exports, all templates, priority support.
              </p>
              <Link href="/pricing"
                className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">
                View pricing →
              </Link>
            </div>
          </div>
        )}

        {/* Edit profile form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Account details</h2>

          <form action={updateProfile} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
            </div>

            {/* Display name */}
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                Display name
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                defaultValue={profile.display_name ?? ''}
                placeholder="Your name or studio name"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Creator type */}
            <div>
              <label htmlFor="creator_type" className="block text-sm font-medium text-gray-700 mb-1">
                I am a…
              </label>
              <select
                id="creator_type"
                name="creator_type"
                defaultValue={profile.creator_type ?? ''}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Select your creator type</option>
                {CREATOR_TYPES.map(ct => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>

            {/* Preferred jurisdiction */}
            <div>
              <label htmlFor="preferred_jurisdiction" className="block text-sm font-medium text-gray-700 mb-1">
                Default jurisdiction
              </label>
              <select
                id="preferred_jurisdiction"
                name="preferred_jurisdiction"
                defaultValue={profile.preferred_jurisdiction ?? 'US'}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <optgroup label="✅ Fully supported (v1)">
                  {JURISDICTION_OPTIONS.filter(j => j.supported).map(j => (
                    <option key={j.code} value={j.code}>{j.label}</option>
                  ))}
                </optgroup>
                <optgroup label="⚠️ Limited support">
                  {JURISDICTION_OPTIONS.filter(j => !j.supported).map(j => (
                    <option key={j.code} value={j.code}>{j.label}</option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Sets the default governing law in your contracts. You can override per-contract.
              </p>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                defaultValue={profile.bio ?? ''}
                placeholder="Short description of what you create"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
              />
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
                Website <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="website_url"
                name="website_url"
                type="url"
                defaultValue={profile.website_url ?? ''}
                placeholder="https://yoursite.com"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Save changes
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Sign out</h2>
          <p className="text-sm text-gray-500 mb-4">
            You&apos;ll be returned to the login page.
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Sign out of PactTailor
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          Templates only — not legal advice.{' '}
          <a href="mailto:hello@pacttailor.com" className="hover:underline">hello@pacttailor.com</a>
        </p>
      </main>
    </div>
  );
}
