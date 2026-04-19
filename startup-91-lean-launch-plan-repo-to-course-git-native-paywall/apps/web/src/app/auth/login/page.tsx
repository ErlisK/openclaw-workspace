import { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Sign in — TeachRepo',
  description: 'Sign in to your TeachRepo account',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0f] text-white">
      {/* Nav */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 font-bold">
            <span className="text-xl">📚</span>
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent text-lg">TeachRepo</span>
          </a>
          <a href="/auth/signup" className="text-sm text-gray-400 hover:text-white transition-colors">
            No account? <span className="text-violet-400 font-medium">Sign up free</span>
          </a>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {/* Glow blob */}
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.06] blur-3xl" />

          <div className="relative text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
            <AuthForm mode="login" />
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <a href="/auth/signup" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
              Sign up free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
