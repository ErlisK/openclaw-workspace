import { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Create account — TeachRepo',
  description: 'Create a free TeachRepo account and start publishing courses',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-violet-600">
            📚 TeachRepo
          </a>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Start publishing courses in minutes</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <AuthForm mode="signup" />
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/auth/login" className="font-medium text-violet-600 hover:underline">
            Sign in
          </a>
        </p>

        <p className="mt-4 text-center text-xs text-gray-400">
          By creating an account, you agree to our{' '}
          <a href="/legal/terms" className="underline">Terms of Service</a>{' '}
          and{' '}
          <a href="/legal/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
