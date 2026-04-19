import { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Sign in — TeachRepo',
  description: 'Sign in to your TeachRepo account',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-violet-600">
            📚 TeachRepo
          </a>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <AuthForm mode="login" />
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          <a href="/auth/forgot-password" className="text-violet-600 hover:underline">
            Forgot password?
          </a>
        </p>
        <p className="mt-2 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <a href="/auth/signup" className="font-medium text-violet-600 hover:underline">
            Sign up free
          </a>
        </p>
      </div>
    </div>
  );
}
