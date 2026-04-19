#!/usr/bin/env node
/**
 * @teachrepo/cli — entry point
 *
 * Install:
 *   npm install -g @teachrepo/cli
 *   npx @teachrepo/cli@latest init
 *
 * Or directly from GitHub:
 *   npx github:ErlisK/openclaw-workspace#main --workspace=packages/cli
 *
 * Commands:
 *   init   — scaffold a new course in the current directory
 *   link   — connect course dir to a TeachRepo instance (stores in .coursekitrc)
 *   push   — push course files to TeachRepo (triggers import)
 *   validate — validate course structure locally
 *   quiz generate <lesson> — AI quiz generation via TeachRepo API
 */

import { program } from 'commander';

program
  .name('teachrepo')
  .description('TeachRepo CLI — convert a GitHub repo into a paywalled course')
  .version('0.2.0');

program
  .command('init [source]')
  .description('Scaffold a new course in the current directory')
  .option('--name <name>', 'Course title')
  .option('--slug <slug>', 'Course URL slug (kebab-case)')
  .action(async (source, opts) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand(source, opts);
  });

program
  .command('link')
  .description('Link this course to a TeachRepo instance and create it via API')
  .option('--api-url <url>', 'TeachRepo API base URL', 'https://teachrepo.com')
  .option('--api-key <key>', 'TeachRepo API key (or set TEACHREPO_API_KEY env var)')
  .action(async (opts) => {
    const { linkCommand } = await import('./commands/link.js');
    await linkCommand(opts);
  });

program
  .command('push')
  .description('Push course files to TeachRepo (triggers re-import/publish)')
  .option('--api-url <url>', 'Override API URL from .coursekitrc')
  .option('--api-key <key>', 'Override API key (or set TEACHREPO_API_KEY)')
  .option('--draft', 'Publish as draft')
  .option('--dry-run', 'Show what would be sent, without sending')
  .action(async (opts) => {
    const { pushCommand } = await import('./commands/push.js');
    await pushCommand(opts);
  });

program
  .command('validate')
  .description('Validate course.yml, lessons frontmatter, and quiz YAML')
  .action(async () => {
    const { validateCommand } = await import('./commands/validate.js');
    await validateCommand();
  });

program
  .command('publish')
  .description('Alias for push — publish your course to TeachRepo')
  .option('--api-key <key>', 'TeachRepo API key')
  .option('--draft', 'Publish as draft')
  .action(async (opts) => {
    const { pushCommand } = await import('./commands/push.js');
    await pushCommand(opts);
  });

program
  .command('quiz generate <lesson-file>')
  .description('Generate AI quiz questions for a lesson')
  .option('-n, --num-questions <n>', 'Number of questions (1-10)', '3')
  .option('--api-url <url>', 'Override API URL from .coursekitrc')
  .option('--api-key <key>', 'Override API key')
  .action(async (lessonFile, opts) => {
    const { quizGenerateCommand } = await import('./commands/quiz-generate.js');
    await quizGenerateCommand(lessonFile, opts);
  });

program.parse();
