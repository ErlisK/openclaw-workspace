/**
 * POST /api/courses/import
 *
 * Alias for /api/import — provides the canonical REST path for the CLI and docs.
 * All logic lives in /api/import/route.ts.
 */
export { POST } from '@/app/api/import/route';

export async function GET() {
  const { NextResponse } = await import('next/server');
  return NextResponse.json(
    {
      endpoint: 'POST /api/courses/import',
      description: 'Import a course from a GitHub repository or direct payload.',
      body: {
        repo_url: 'string (GitHub URL)',
        branch: 'string? (optional)',
        path: 'string? (subdirectory, optional)',
        token: 'string? (PAT for private repos)',
      },
    },
    { status: 200 },
  );
}
