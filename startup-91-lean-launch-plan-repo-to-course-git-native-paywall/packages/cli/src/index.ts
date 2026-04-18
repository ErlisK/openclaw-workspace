#!/usr/bin/env node
/**
 * @teachrepo/cli — entry point
 * Commands: init, dev, validate, build, publish, quiz
 */

import { program } from 'commander';

program
  .name('teachrepo')
  .description('Convert a GitHub repo into a paywalled course site')
  .version('0.1.0');

program
  .command('init [repo-url-or-path]')
  .description('Initialize a new course from a GitHub repo URL or local folder')
  .option('--no-scaffold', 'Skip adding frontmatter scaffolding to existing files')
  .action(async (source, opts) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand(source, opts);
  });

program
  .command('dev')
  .description('Preview your course locally at http://localhost:3000')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .action(async (opts) => {
    const { devCommand } = await import('./commands/dev.js');
    await devCommand(opts);
  });

program
  .command('validate')
  .description('Validate course structure, quiz YAML, and config')
  .action(async () => {
    const { validateCommand } = await import('./commands/validate.js');
    await validateCommand();
  });

program
  .command('build')
  .description('Build static course assets')
  .action(async () => {
    const { buildCommand } = await import('./commands/build.js');
    await buildCommand();
  });

program
  .command('publish')
  .description('Publish your course to TeachRepo')
  .option('--token <token>', 'TeachRepo API token (or set TEACHREPO_API_KEY env var)')
  .option('--draft', 'Publish as draft (not publicly visible)')
  .action(async (opts) => {
    const { publishCommand } = await import('./commands/publish.js');
    await publishCommand(opts);
  });

program
  .command('quiz generate <lesson-file>')
  .description('Generate quiz questions for a lesson using AI')
  .option('-n, --num-questions <n>', 'Number of questions to generate', '3')
  .action(async (lessonFile, opts) => {
    const { quizGenerateCommand } = await import('./commands/quiz-generate.js');
    await quizGenerateCommand(lessonFile, opts);
  });

program.parse();
