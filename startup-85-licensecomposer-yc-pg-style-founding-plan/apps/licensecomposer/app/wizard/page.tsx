/**
 * app/wizard/page.tsx
 * Entry point for the wizard. Supports ?template= to pre-select a template.
 * Renders the client-side WizardShell.
 * Anonymous users can use the wizard; only export/download is gated.
 */
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import WizardShell from '@/components/WizardShell';

export const metadata: Metadata = {
  title: 'Create Contract | PactTailor',
  description: 'Answer 5 questions and get a ready-to-sign contract in under 90 seconds.',
};

export default async function WizardPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; draft?: string }>;
}) {
  const sp = await searchParams;
  const draftId = sp.draft;

  return <WizardShell initialDraftId={draftId} />;
}
