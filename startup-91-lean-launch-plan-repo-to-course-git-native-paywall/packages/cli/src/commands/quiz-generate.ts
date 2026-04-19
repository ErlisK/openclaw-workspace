/**
 * teachrepo quiz generate <lesson-file>
 *
 * Calls POST /api/quiz/generate with lesson content and writes YAML to quizzes/.
 */

import fs from 'fs';
import path from 'path';
import { readConfig, resolveApiKey, resolveApiUrl } from '../config.js';

interface QuizGenOptions {
  numQuestions?: string;
  apiUrl?: string;
  apiKey?: string;
}

export async function quizGenerateCommand(lessonFile: string, opts: QuizGenOptions) {
  const cwd = process.cwd();
  const config = readConfig(cwd);
  const apiUrl = resolveApiUrl(opts, config);
  const apiKey = opts.apiKey || config?.apiKey || resolveApiKey(opts);
  const numQuestions = Math.min(10, Math.max(1, parseInt(opts.numQuestions || '3', 10)));

  if (!apiKey) {
    console.error('❌ No API key. Run `teachrepo link` or set TEACHREPO_API_KEY.');
    process.exit(1);
  }

  // Resolve lesson file
  const candidates = [
    lessonFile,
    path.join(cwd, lessonFile),
    path.join(cwd, 'lessons', lessonFile),
  ];
  const lessonPath = candidates.find(p => fs.existsSync(path.isAbsolute(p) ? p : path.join(cwd, p)));
  if (!lessonPath) {
    console.error(`❌ Lesson file not found: ${lessonFile}`);
    process.exit(1);
  }

  const lessonContent = fs.readFileSync(lessonPath, 'utf-8');
  const slugMatch = lessonContent.match(/^---\r?\n[\s\S]*?slug:\s*["']?([^"'\n]+)/m);
  const slug = slugMatch?.[1]?.trim() || path.basename(lessonPath, '.md');
  const quizId = `${slug}-quiz`;

  console.log('');
  console.log('🤖 teachrepo quiz generate');
  console.log('──────────────────────────────────────────────────────');
  console.log('   Lesson: ' + path.relative(cwd, lessonPath));
  console.log('   Questions: ' + numQuestions);
  console.log('   Output: quizzes/' + quizId + '.yml');
  console.log('');
  process.stdout.write('   Generating with AI...');

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ lessonContent, numQuestions, quizId }),
    });
  } catch (err) {
    console.error(`\n❌ Network error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const body = await response.json().catch(() => ({ error: 'Non-JSON' })) as Record<string, unknown>;

  if (!response.ok) {
    if (response.status === 503) {
      console.log('\n⚠️  AI quiz generation requires a deployed Vercel instance.');
      console.log('   ' + (body.hint as string || ''));
    } else {
      console.error(`\n❌ Generation failed (HTTP ${response.status}): ${body.error || ''}`);
    }
    process.exit(1);
  }

  const yaml = body.yaml as string;
  console.log(' done.\n');

  fs.mkdirSync(path.join(cwd, 'quizzes'), { recursive: true });
  const outputPath = path.join(cwd, 'quizzes', `${quizId}.yml`);

  if (fs.existsSync(outputPath)) {
    const backup = outputPath.replace('.yml', `.bak-${Date.now()}.yml`);
    fs.renameSync(outputPath, backup);
    console.log('   ⚠️  Backed up existing quiz to ' + path.basename(backup));
  }

  fs.writeFileSync(outputPath, yaml, 'utf-8');
  console.log('✅ Quiz generated: quizzes/' + quizId + '.yml');
  console.log('');
  console.log('   Review, then: teachrepo validate && teachrepo push');
  console.log('');
}
