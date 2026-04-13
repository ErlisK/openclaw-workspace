#!/usr/bin/env npx ts-node
/**
 * scripts/rls-smoke-test.ts
 * Verifies that RLS prevents cross-user data access.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   TEST_USER_A_EMAIL=user-a@example.com TEST_USER_A_PASS=... \
 *   TEST_USER_B_EMAIL=user-b@example.com TEST_USER_B_PASS=... \
 *   npx ts-node scripts/rls-smoke-test.ts
 *
 * Requires two test user accounts created in Supabase Auth.
 * Tables tested: generated_contracts, purchases, entitlements, license_pages
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

const USER_A_EMAIL = process.env.TEST_USER_A_EMAIL ?? 'test-user-a@example.com';
const USER_A_PASS  = process.env.TEST_USER_A_PASS  ?? 'test-password-a-123!';
const USER_B_EMAIL = process.env.TEST_USER_B_EMAIL ?? 'test-user-b@example.com';
const USER_B_PASS  = process.env.TEST_USER_B_PASS  ?? 'test-password-b-123!';

let passCount = 0;
let failCount = 0;

async function runTest(label: string, fn: () => Promise<void>) {
  process.stdout.write(`  [TEST] ${label}... `);
  try {
    await fn();
    console.log('PASS');
    passCount++;
  } catch (err) {
    console.log(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    failCount++;
    process.exitCode = 1;
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('\n=== RLS Smoke Test ===\n');

  // --- Auth ---
  console.log('Authenticating test users...');
  const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
    email: USER_A_EMAIL,
    password: USER_A_PASS,
  });
  if (errA || !authA.user) {
    console.error('FATAL: Cannot sign in as User A:', errA?.message);
    console.log('Create test users in Supabase Auth or set TEST_USER_A_EMAIL/PASS env vars.');
    process.exit(1);
  }
  console.log(`User A: ${authA.user.id}`);

  const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
    email: USER_B_EMAIL,
    password: USER_B_PASS,
  });
  if (errB || !authB.user) {
    console.error('FATAL: Cannot sign in as User B:', errB?.message);
    process.exit(1);
  }
  console.log(`User B: ${authB.user.id}\n`);

  const userAId = authA.user.id;

  // ── 1. generated_contracts ─────────────────────────────────────────────────
  console.log('1. generated_contracts');

  const contractDocId = `smoke-test-${Date.now()}`;
  const { data: insertedContract, error: insertErr } = await clientA
    .from('generated_contracts')
    .insert({
      document_id: contractDocId,
      user_id: userAId,
      document_type: 'commercial_asset_license',
      jurisdiction_code: 'US',
      wizard_answers: {},
      filled_legal_text: 'RLS smoke test contract',
    })
    .select('id')
    .single();

  if (insertErr || !insertedContract) {
    console.log(`  SKIP: Cannot create test contract (${insertErr?.message ?? 'unknown'})`);
  } else {
    await runTest('User B cannot read User A contract', async () => {
      const { data } = await clientB
        .from('generated_contracts')
        .select('id')
        .eq('document_id', contractDocId);
      if (data && data.length > 0) {
        throw new Error('VIOLATION: User B can read User A contract!');
      }
    });

    await runTest('User A can read own contract', async () => {
      const { data, error } = await clientA
        .from('generated_contracts')
        .select('id')
        .eq('document_id', contractDocId);
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('User A cannot read own contract — RLS too restrictive');
      }
    });

    await runTest('User B cannot update User A contract', async () => {
      const { error } = await clientB
        .from('generated_contracts')
        .update({ document_type: 'hacked' })
        .eq('document_id', contractDocId);
      // Should silently fail (0 rows updated) or return RLS error — either is correct
      const { data: check } = await clientA
        .from('generated_contracts')
        .select('document_type')
        .eq('document_id', contractDocId)
        .single();
      if (check?.document_type === 'hacked') {
        throw new Error('VIOLATION: User B updated User A contract!');
      }
      void error; // suppress unused warning
    });

    // Cleanup
    await clientA.from('generated_contracts').delete().eq('document_id', contractDocId);
  }

  // ── 2. purchases ───────────────────────────────────────────────────────────
  console.log('\n2. purchases');
  await runTest('User B cannot read User A purchases', async () => {
    const { data: aData } = await clientA.from('purchases').select('id').limit(5);
    if (!aData || aData.length === 0) return; // no data to test
    const { data: bData } = await clientB
      .from('purchases')
      .select('id')
      .in('id', aData.map((r: { id: string }) => r.id));
    if (bData && bData.length > 0) {
      throw new Error('VIOLATION: User B can read User A purchases!');
    }
  });

  // ── 3. entitlements ────────────────────────────────────────────────────────
  console.log('\n3. entitlements');
  await runTest('User B cannot read User A entitlements', async () => {
    const { data: aData } = await clientA.from('entitlements').select('id').limit(5);
    if (!aData || aData.length === 0) return;
    const { data: bData } = await clientB
      .from('entitlements')
      .select('id')
      .in('id', aData.map((r: { id: string }) => r.id));
    if (bData && bData.length > 0) {
      throw new Error('VIOLATION: User B can read User A entitlements!');
    }
  });

  // ── 4. license_pages ───────────────────────────────────────────────────────
  console.log('\n4. license_pages');
  await runTest('User B cannot read User A private license pages', async () => {
    const { data: aData } = await clientA.from('license_pages').select('id').limit(5);
    if (!aData || aData.length === 0) return;
    const { data: bData } = await clientB
      .from('license_pages')
      .select('id')
      .in('id', aData.map((r: { id: string }) => r.id));
    if (bData && bData.length > 0) {
      throw new Error('VIOLATION: User B can read User A license pages!');
    }
  });

  // ── 5. exports ─────────────────────────────────────────────────────────────
  console.log('\n5. exports');
  await runTest('User B cannot read User A exports', async () => {
    const { data: aData } = await clientA.from('exports').select('id').limit(5);
    if (!aData || aData.length === 0) return;
    const { data: bData } = await clientB
      .from('exports')
      .select('id')
      .in('id', aData.map((r: { id: string }) => r.id));
    if (bData && bData.length > 0) {
      throw new Error('VIOLATION: User B can read User A exports!');
    }
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed ===\n`);

  if (failCount > 0) {
    console.error('RLS smoke tests FAILED. Fix policy violations before deploying.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
