import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'YAML-Frontmatter Quizzes for Engineers — TeachRepo Blog',
  description: 'How TeachRepo implements auto-graded quizzes using YAML frontmatter — zero database writes, instant feedback, works in static builds.',
  openGraph: {
    title: 'YAML-Frontmatter Quizzes for Engineers',
    description: 'Auto-graded quizzes with zero backend — how TeachRepo does it with YAML frontmatter.',
    url: 'https://teachrepo.com/blog/yaml-frontmatter-quizzes',
    type: 'article',
    publishedTime: '2025-04-22',
  },
};

export default function YamlFrontmatterQuizzes() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="text-sm text-gray-400 hover:text-violet-600 mb-8 inline-block">
          ← Back to blog
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2025-04-22">April 22, 2025</time>
            <span>·</span>
            <span>7 min read</span>
            <span className="rounded-full bg-violet-50 text-violet-600 px-2 py-0.5 font-medium">engineering</span>
            <span className="rounded-full bg-gray-50 text-gray-600 px-2 py-0.5 font-medium">quizzes</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">
            YAML-Frontmatter Quizzes for Engineers
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            How TeachRepo auto-grades quiz questions defined in Markdown frontmatter —
            zero database writes, instant feedback, no server round-trips.
          </p>
        </header>

        <div className="space-y-6 text-gray-700 leading-relaxed">

          <h2 className="text-xl font-bold text-gray-900 mt-10">Why Frontmatter?</h2>
          <p>
            Most course platforms treat quizzes as a separate content type — you build them in a drag-and-drop UI,
            they live in a different database table, and they require their own API calls.
          </p>
          <p>
            TeachRepo takes a different approach: quizzes are just YAML inside your lesson file.
            Same repo, same commit, same review process. If a quiz answer is wrong, you open a PR.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">The Schema</h2>
          <p>Here&apos;s a complete lesson with a quiz:</p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`---
title: "Git Rebase: The Complete Picture"
access: paid
quiz:
  - q: "What does \`git rebase main\` do when run from a feature branch?"
    options:
      - "Merges main into your feature branch, creating a merge commit"
      - "Replays your feature branch commits on top of main"
      - "Pushes your branch to origin/main"
      - "Creates a new branch from main"
    answer: "Replays your feature branch commits on top of main"
    explanation: |
      Rebase replays your commits on top of the target branch, producing
      a linear history. Unlike merge, it rewrites commit hashes.

  - q: "When should you prefer rebase over merge?"
    options:
      - "Always — rebase is strictly better"
      - "Never — rebase rewrites history and is dangerous"
      - "For local cleanup before sharing; avoid on shared branches"
      - "Only for squashing commits"
    answer: "For local cleanup before sharing; avoid on shared branches"
    explanation: |
      Rebase is great for tidying up local work before a PR review.
      On shared branches (main, develop), force-pushing rebased commits
      breaks everyone else's checkout.
---

# Git Rebase: The Complete Picture

Lesson content here...`}
          </pre>

          <h2 className="text-xl font-bold text-gray-900 mt-10">How Grading Works</h2>
          <p>
            When a student submits a quiz, TeachRepo grades it <strong>client-side</strong>:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>The lesson page is rendered with quiz data embedded in the HTML (at build time)</li>
            <li>Student selects answers and clicks &quot;Submit Quiz&quot;</li>
            <li>JavaScript compares selected answers against the correct answers (already in the DOM)</li>
            <li>Score is computed; feedback is shown immediately</li>
            <li>A non-blocking <code className="bg-gray-100 px-1 rounded text-sm">quiz_submitted</code> event is sent to the analytics endpoint</li>
          </ol>
          <p>
            No server round-trip. No database write on the critical path. Quiz results appear in
            &lt;50ms regardless of network conditions.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">The Quiz Component</h2>
          <p>
            TeachRepo&apos;s Quiz component is a straightforward React state machine:
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`// Simplified quiz state
type QuizState = 'unanswered' | 'submitted';

// Each question tracks:
// - selected: string | null  (the chosen option)
// - correct: boolean | null  (null until submitted)

// On submit:
const grade = (questions: Question[], answers: Record<number, string>) => {
  return questions.map((q, i) => ({
    ...q,
    selectedAnswer: answers[i] ?? null,
    correct: answers[i] === q.answer,
  }));
};

// Score is just:
const score = graded.filter(q => q.correct).length;
const pct = Math.round((score / total) * 100);`}
          </pre>

          <p>
            After submission, correct answers turn green with an explanation, wrong answers turn red.
            The student can see exactly where they went wrong without any server involvement.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Security: Can Students Cheat?</h2>
          <p>
            Yes — a determined student can read the correct answers from the page source.
            This is an intentional tradeoff. Here&apos;s the reasoning:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>These are learning quizzes, not certification exams.</strong> The goal is to reinforce understanding, not gatekeep credentials.</li>
            <li><strong>Hiding answers requires a backend round-trip</strong>, which adds latency, complexity, and cost — not worth it for learning reinforcement.</li>
            <li><strong>Students who cheat only hurt themselves.</strong> If they skip the quiz to unlock the next lesson, they miss the learning feedback loop.</li>
          </ul>
          <p>
            If you need tamper-proof quiz scoring (e.g., for certifications), that&apos;s a different product.
            For technical courses, the fast client-side UX wins.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Explanation Fields</h2>
          <p>
            Every quiz option can have an <code className="bg-gray-100 px-1 rounded text-sm">explanation</code> field.
            After submission, the explanation for the correct answer is shown regardless of whether the student got it right.
          </p>
          <p>This is the most valuable part of the quiz. A good explanation:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Reinforces <em>why</em> the answer is correct</li>
            <li>Points to relevant documentation or concepts</li>
            <li>Preemptively addresses common misconceptions</li>
          </ul>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`quiz:
  - q: "What's the time complexity of \`git log --oneline\`?"
    options:
      - "O(1)"
      - "O(log n) where n = number of commits"
      - "O(n) where n = number of commits"
      - "O(n²) due to graph traversal"
    answer: "O(n) where n = number of commits"
    explanation: |
      git log traverses the commit DAG from HEAD, visiting each commit
      once. With --oneline it outputs one line per commit but still
      traverses the full history unless you specify --max-count or a
      revision range. Use \`git log --oneline -20\` to limit output.`}
          </pre>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Analytics</h2>
          <p>
            TeachRepo fires a non-blocking <code className="bg-gray-100 px-1 rounded text-sm">quiz_submitted</code> event
            to <code className="bg-gray-100 px-1 rounded text-sm">POST /api/events</code> after each submission.
            This writes asynchronously to Supabase and shows in your creator dashboard:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Average score per quiz</li>
            <li>Most-missed questions (useful for improving lesson content)</li>
            <li>Completion rate (students who submitted vs. students who viewed)</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Editing Quizzes</h2>
          <p>
            Editing a quiz is as simple as editing a <code className="bg-gray-100 px-1 rounded text-sm">.md</code> file:
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`# Fix a typo in a quiz option:
git checkout -b fix/quiz-typo
# Edit the .md file
git add lessons/03-advanced.md
git commit -m "fix: correct typo in quiz option 2"
git push

# CI validates the YAML + answer keys, then deploys.
# Done.`}
          </pre>

          <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">
            <p className="font-semibold text-violet-900 mb-2">Try the quiz system on a live course</p>
            <p className="text-violet-700 text-sm mb-4">
              The free &quot;Git for Engineers&quot; course has quiz questions you can try right now — no signup needed for the first lesson.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://teachrepo.com/marketplace" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                Try a live course →
              </a>
              <a href="https://teachrepo.com/auth/signup" className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:border-violet-500">
                Create your course
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
          <Link href="/blog" className="hover:text-violet-600">← Back to blog</Link>
          <a href="https://teachrepo.com" className="hover:text-violet-600">teachrepo.com</a>
        </div>
      </div>
    </div>
  );
}
