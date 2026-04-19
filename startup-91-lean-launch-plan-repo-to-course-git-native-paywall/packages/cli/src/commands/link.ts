/**
 * teachrepo link --api-url <url>
 *
 * Links the current course directory to a TeachRepo instance.
 * Writes a .teachrepo/config.json file with the API URL.
 * Used by `teachrepo push` to know where to send the course.
 */

import fs from 'fs';
import path from 'path';

interface TeachRepoConfig {
  apiUrl: string;
  linkedAt: string;
}

export async function linkCommand(opts: { apiUrl?: string }) {
  const cwd = process.cwd();

  const apiUrl = opts.apiUrl || process.env.TEACHREPO_API_URL || 'https://teachrepo.com';

  // Normalize URL
  const normalizedUrl = apiUrl.replace(/\/$/, '');

  // Test connectivity
  console.log(`\n🔗 Linking to ${normalizedUrl} ...`);

  try {
    const res = await fetch(`${normalizedUrl}/api/import`, {
      method: 'GET',
    });
    // 401 is expected (no auth) — just verifying the server is reachable
    if (res.status !== 401 && res.status !== 405 && !res.ok) {
      console.error(`❌ Could not reach ${normalizedUrl} (HTTP ${res.status})`);
      console.error('   Make sure the API URL is correct and the server is running.');
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`   Is ${normalizedUrl} reachable?`);
    process.exit(1);
  }

  // Write config
  const configDir = path.join(cwd, '.teachrepo');
  fs.mkdirSync(configDir, { recursive: true });

  const config: TeachRepoConfig = {
    apiUrl: normalizedUrl,
    linkedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(configDir, 'config.json'),
    JSON.stringify(config, null, 2) + '\n',
    'utf-8',
  );

  // Add .teachrepo/config.json to .gitignore if not already there
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf-8');
    if (!existing.includes('.teachrepo')) {
      fs.appendFileSync(gitignorePath, '\n# TeachRepo local config\n.teachrepo/\n');
    }
  }

  console.log(`✅ Linked to ${normalizedUrl}`);
  console.log(`   Config saved to .teachrepo/config.json`);
  console.log('');
  console.log('Next steps:');
  console.log('   Set your API key: export TEACHREPO_API_KEY=<your-key>');
  console.log('   Push your course: teachrepo push');
  console.log('');
}
