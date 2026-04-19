#!/usr/bin/env node
/**
 * @teachrepo/cli — entry point
 * Commands: init, link, push, validate, dev, build, publish, quiz generate
 */

import { program } from 'commander';

program
  .name('teachrepo')
  .description('Convert a GitHub repo into a paywalled course site')
  .version('0.1.0');

// ── init ──────────────────────────────────────────────────────────────────
program
  .command('init [repo-url-or-path]')
  .description('Scaffold a new course in the current directory')
  .option('--no-scaffold', 'Skip adding frontmatter scaffolding to existing files')
  .action(async (source, opts) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand(source, opts);
  });

// ── link ──────────────────────────────────────────────────────────────────
program
  .command('link')
  .description('Link this course directory to a TeachRepo instance')
  .option('--api-url <url>', 'TeachRepo API base URL', 'https://teachrepo.com')
  .action(async (opts) => {
    const { linkCommand } = await import('./commands/link.js');
    await linkCommand(opts);
  });

// ── push ──────────────────────────────────────────────────────────────────
program
  .command('push')
  .description('Push the current course to TeachRepo (import + publish)')
  .option('--api-url <url>', 'TeachRepo API base URL (overrides .teachrepo/config.json)')
  .option('--token <token>', 'API key (or set TEACHREPO_API_KEY env var)')
  .option('--draft', 'Publish as draft (not publicly visible)')
  .option('--dry-run', 'Validate and report what would be pushed, without sending')
  .action(async (opts) => {
    const { pushCommand } = await import('./commands/push.js');
    await pushCommand(opts);
  });

// ── validate ──────────────────────────────────────────────────────────────
program
  .command('validate')
  .description('Validate course structure, frontmatter, and quiz YAML')
  .action(async () => {
    const { validateCommand } = await import('./commands/validate.js');
    await validateCommand();
  });

// ── dev ───────────────────────────────────────────────────────────────────
program
  .command('dev')
  .description('Preview your course locally')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .action(async (opts) => {
    const { devCommand } = await import('./commands/dev.js');
    await devCommand(opts);
  });

// ── build ─────────────────────────────────────────────────────────────────
program
  .command('build')
  .description('Build static course assets for self-hosting')
  .action(async () => {
    const { buildCommand } = await import('./commands/dev.js');
    await buildCommand();
  });

// ── publish (alias for push) ──────────────────────────────────────────────
program
  .command('publish')
  .description('Publish your course to TeachRepo (alias for push)')
  .option('--token <token>', 'TeachRepo API token (or set TEACHREPO_API_KEY env var)')
  .option('--draft', 'Publish as draft (not publicly visible)')
  .action(async (opts) => {
    const { publishCommand } = await import('./commands/dev.js');
    await publishCommand(opts);
  });

// ── quiz generate ─────────────────────────────────────────────────────────
program
  .command('quiz generate <lesson-file>')
  .description('Generate quiz questions for a lesson using AI')
  .option('-n, --num-questions <n>', 'Number of questions to generate', '3')
  .option('--api-url <url>', 'TeachRepo API base URL')
  .option('--token <token>', 'API key (or set TEACHREPO_API_KEY env var)')
  .action(async (lessonFile, opts) => {
    const { quizGenerateCommand } = await import('./commands/quiz-generate.js');
    await quizGenerateCommand(lessonFile, opts);
  });

program.parse();
