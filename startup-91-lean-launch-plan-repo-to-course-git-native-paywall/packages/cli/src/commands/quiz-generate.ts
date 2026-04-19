/**
 * teachrepo quiz generate <lesson-file>
 *
 * Calls the TeachRepo AI quiz generation API (POST /api/quiz/generate)
 * with the lesson markdown content. Writes the generated quiz YAML to
 * quizzes/{lesson-slug}-quiz.yml.
 *
 * Requires: TEACHREPO_API_KEY env var and linked API URL.
 */

import fs from 'fs';
import path from 'path';

interface QuizGenerateOptions {
  numQuestions?: string;
  apiUrl?: string;
  token?: string;
}

function readConfig(cwd: string): { apiUrl?: string } {
  const configPath = path.join(cwd, '.teachrepo', 'config.json');
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { apiUrl: string };
  } catch {
    return {};
  }
}

export async function quizGenerateCommand(lessonFile: string, opts: QuizGenerateOptions) {
  const cwd = process.cwd();

  const config = readConfig(cwd);
  const apiUrl = (opts.apiUrl || config.apiUrl || process.env.TEACHREPO_API_URL || 'https://teachrepo.com').replace(/\/$/, '');
  const token = opts.token || process.env.TEACHREPO_API_KEY || '';
  const numQuestions = parseInt(opts.numQuestions || '3', 10);

  // Resolve lesson file path
  const lessonPath = path.isAbsolute(lessonFile)
    ? lessonFile
    : fs.existsSync(path.join(cwd, lessonFile))
      ? path.join(cwd, lessonFile)
      : fs.existsSync(path.join(cwd, 'lessons', lessonFile))
        ? path.join(cwd, 'lessons', lessonFile)
        : null;

  if (!lessonPath || !fs.existsSync(lessonPath)) {
    console.error(`❌ Lesson file not found: ${lessonFile}`);
    console.error('   Tried: ./' + lessonFile + ' and ./lessons/' + lessonFile);
    process.exit(1);
  }

  const lessonContent = fs.readFileSync(lessonPath, 'utf-8');

  // Extract slug from frontmatter for output filename
  const slugMatch = lessonContent.match(/^---\r?\n[\s\S]*?slug:\s*["']?([^"'\n]+)["']?/m);
  const slug = slugMatch?.[1]?.trim() || path.basename(lessonPath, '.md');
  const quizId = `${slug}-quiz`;
  const outputPath = path.join(cwd, 'quizzes', `${quizId}.yml`);

  console.log('');
  console.log('🤖 teachrepo quiz generate');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`   Lesson: ${path.relative(cwd, lessonPath)}`);
  console.log(`   Questions: ${numQuestions}`);
  console.log(`   Output: quizzes/${quizId}.yml`);
  console.log('');
  console.log('   Generating with AI...');

  if (!token) {
    console.error('❌ No API key. Set TEACHREPO_API_KEY or pass --token.');
    process.exit(1);
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/quiz/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        lessonContent,
        numQuestions,
        quizId,
      }),
    });
  } catch (err) {
    console.error(`❌ Network error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const body = await response.json().catch(() => ({ error: 'Non-JSON response' })) as Record<string, unknown>;

  if (!response.ok) {
    console.error(`❌ Quiz generation failed (HTTP ${response.status}): ${body.error || JSON.stringify(body)}`);
    process.exit(1);
  }

  const yamlContent = body.yaml as string;
  if (!yamlContent) {
    console.error('❌ API returned no YAML content');
    process.exit(1);
  }

  // Ensure quizzes/ dir exists
  fs.mkdirSync(path.join(cwd, 'quizzes'), { recursive: true });

  // Check if file already exists
  if (fs.existsSync(outputPath)) {
    const backup = outputPath.replace('.yml', `.backup-${Date.now()}.yml`);
    fs.renameSync(outputPath, backup);
    console.log(`   ⚠️  Backed up existing quiz to ${path.relative(cwd, backup)}`);
  }

  fs.writeFileSync(outputPath, yamlContent, 'utf-8');

  console.log(`✅ Quiz generated: quizzes/${quizId}.yml`);
  console.log('');
  console.log('   Review the generated questions, then run:');
  console.log('   teachrepo validate');
  console.log('');
}
