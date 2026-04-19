/**
 * teachrepo dev — local preview (stub)
 * Opens the course at localhost:3000 if a TeachRepo dev server is running.
 */

export async function devCommand(opts: { port?: string }) {
  const port = opts.port || '3000';
  console.log(`\n📖 teachrepo dev`);
  console.log(`──────────────────────────────────────────────────────`);
  console.log(`  Starting preview at http://localhost:${port}`);
  console.log('');
  console.log('  Self-hosted instance required for local dev preview.');
  console.log('  Deploy your own: https://vercel.com/new/clone?repository-url=https://github.com/ErlisK/openclaw-workspace');
  console.log('');
  console.log('  Or use the TeachRepo sandbox: https://teachrepo.com/sandbox');
  console.log('');
}

/**
 * teachrepo build — static export (stub)
 */
export async function buildCommand() {
  console.log('\n🔨 teachrepo build');
  console.log('  Run `teachrepo validate` to check your course.');
  console.log('  Then `teachrepo push` to publish to TeachRepo.\n');
}

/**
 * teachrepo publish — alias for push (backwards compat)
 */
export async function publishCommand(opts: { token?: string; draft?: boolean }) {
  const { pushCommand } = await import('./push.js');
  await pushCommand(opts);
}
