'use client';
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

export interface QuizQuestion {
  id: string;
  question: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_index: number | null;
  correct_bool: boolean | null;
  explanation: string | null;
  order_index: number;
}

export interface QuizProps {
  quizId: string;
  title: string;
  passThreshold: number;
  questions: QuizQuestion[];
  courseId: string;
  lessonId?: string | null;
}

type Answer = number | boolean | string | null;

interface GradeResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  feedback: Record<string, { correct: boolean; explanation: string | null }>;
}

interface AttemptSummary {
  attempt_number: number;
  score_pct: number | null;
  passed: boolean | null;
  attempted_at: string;
  correct: number;
  total: number;
}

interface AttemptHistory {
  attempts: AttemptSummary[];
  best_score: number | null;
  total_attempts: number;
  ever_passed: boolean;
}

// ─── Score ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke={passed ? '#16a34a' : '#dc2626'}
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
        className="text-sm font-bold" style={{ fontSize: 18, fontWeight: 700 }}
        fill={passed ? '#16a34a' : '#dc2626'}>
        {score}%
      </text>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Quiz({ quizId, title, passThreshold, questions, courseId, lessonId }: QuizProps) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<AttemptHistory | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Load attempt history on mount
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz/${quizId}/attempts?course_id=${courseId}`);
      if (res.ok) {
        const data: AttemptHistory = await res.json();
        setHistory(data);
      }
    } catch { /* non-fatal */ }
  }, [quizId, courseId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const allAnswered = questions.every(
    (q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '',
  );

  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '',
  ).length;

  const handleAnswer = (questionId: string, value: Answer) => {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!allAnswered || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          course_id: courseId,
          lesson_id: lessonId ?? null,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit quiz');
      } else {
        setResult(data);
        setSubmitted(true);
        // Refresh history after submission
        await loadHistory();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setError('');
  };

  // ── Results view ─────────────────────────────────────────────────────────

  if (submitted && result) {
    return (
      <div className="my-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Result header */}
        <div className={`px-6 py-5 ${result.passed ? 'bg-green-50 border-b border-green-100' : 'bg-amber-50 border-b border-amber-100'}`}>
          <div className="flex items-center gap-5">
            <ScoreRing score={result.score} passed={result.passed} />
            <div>
              <h3 className={`text-xl font-bold ${result.passed ? 'text-green-900' : 'text-amber-900'}`}>
                {result.passed ? '🎉 Quiz passed!' : '📚 Keep studying'}
              </h3>
              <p className={`text-sm mt-1 ${result.passed ? 'text-green-700' : 'text-amber-700'}`}>
                <strong>{result.correct}/{result.total}</strong> correct
                {' · '}Needed <strong>{passThreshold}%</strong>
              </p>
              {history && history.total_attempts > 1 && (
                <p className="text-xs mt-1 text-gray-500">
                  Best score: <strong>{history.best_score}%</strong>
                  {' · '}{history.total_attempts} attempt{history.total_attempts !== 1 ? 's' : ''}
                  {history.ever_passed && ' · ✅ Passed before'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Per-question feedback */}
        <div className="divide-y divide-gray-100 px-6">
          {questions.map((q, i) => {
            const fb = result.feedback[q.id];
            const userAns = answers[q.id];

            let userDisplay = '—';
            let correctDisplay = '';

            if (q.question_type === 'multiple_choice') {
              userDisplay = q.options?.[userAns as number] ?? '—';
              if (!fb?.correct && q.correct_index !== null) {
                correctDisplay = q.options?.[q.correct_index] ?? '';
              }
            } else if (q.question_type === 'true_false') {
              userDisplay = userAns ? 'True' : 'False';
              if (!fb?.correct) {
                correctDisplay = q.correct_bool ? 'True' : 'False';
              }
            } else if (q.question_type === 'short_answer') {
              userDisplay = String(userAns ?? '—');
            }

            return (
              <div key={q.id} className="py-4">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex-shrink-0 text-base">
                    {fb?.correct ? '✅' : '❌'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800">
                      {i + 1}. {q.question}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs">
                      <span className={fb?.correct ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                        Your answer: {userDisplay}
                      </span>
                      {!fb?.correct && correctDisplay && (
                        <span className="text-green-700 font-medium">
                          ✓ Correct: {correctDisplay}
                        </span>
                      )}
                    </div>
                    {fb?.explanation && (
                      <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-600 border border-gray-100">
                        💡 {fb.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center gap-3">
          {!result.passed && (
            <button
              onClick={handleRetry}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Try again →
            </button>
          )}
          {result.passed && (
            <span className="text-sm text-green-700 font-medium">
              ✅ You passed — continue to the next lesson!
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz form view ────────────────────────────────────────────────────────

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-violet-100 bg-violet-50 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {questions.length} question{questions.length !== 1 ? 's' : ''}
                {' · '}{passThreshold}% to pass
              </p>
            </div>
          </div>

          {/* Previous attempts badge */}
          {history && history.total_attempts > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex-shrink-0 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-violet-300 hover:text-violet-700"
            >
              {history.ever_passed ? '✅' : '📊'} {history.total_attempts} attempt{history.total_attempts !== 1 ? 's' : ''}
              {history.best_score !== null && ` · best ${history.best_score}%`}
            </button>
          )}
        </div>

        {/* History dropdown */}
        {showHistory && history && history.attempts.length > 0 && (
          <div className="mt-3 rounded-xl border border-violet-100 bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Attempt</th>
                  <th className="text-left px-4 py-2 font-medium">Score</th>
                  <th className="text-left px-4 py-2 font-medium">Result</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.attempts.map((a) => (
                  <tr key={a.attempt_number} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">#{a.attempt_number}</td>
                    <td className="px-4 py-2">{a.score_pct ?? 0}%</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${
                        a.passed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {a.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {new Date(a.attempted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-violet-400 transition-all duration-300"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>

      {/* Questions */}
      <div className="divide-y divide-gray-100 px-6">
        {questions.map((q, i) => (
          <div key={q.id} className="py-6">
            <div className="flex items-start gap-3 mb-4">
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{q.question}</p>
            </div>

            {/* Multiple choice */}
            {q.question_type === 'multiple_choice' && q.options && (
              <div className="space-y-2 pl-9">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-all ${
                      answers[q.id] === oi
                        ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/40 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={oi}
                      checked={answers[q.id] === oi}
                      onChange={() => handleAnswer(q.id, oi)}
                      className="accent-violet-600 flex-shrink-0"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* True / False */}
            {q.question_type === 'true_false' && (
              <div className="flex gap-3 pl-9">
                {[true, false].map((val) => (
                  <label
                    key={String(val)}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all ${
                      answers[q.id] === val
                        ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/40 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === val}
                      onChange={() => handleAnswer(q.id, val)}
                      className="accent-violet-600"
                    />
                    {val ? '👍 True' : '👎 False'}
                  </label>
                ))}
              </div>
            )}

            {/* Short answer */}
            {q.question_type === 'short_answer' && (
              <div className="pl-9">
                <input
                  type="text"
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder="Type your answer…"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit footer */}
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between gap-4">
        <span className="text-xs text-gray-400">
          {answeredCount}/{questions.length} answered
        </span>
        {error && <p className="text-xs text-red-600 flex-1">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || loading}
          aria-label={!allAnswered ? 'Answer all questions to submit' : 'Submit quiz'}
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading
            ? <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Grading…
              </span>
            : !allAnswered
            ? `Answer all ${questions.length} questions`
            : 'Submit quiz →'}
        </button>
      </div>
    </div>
  );
}
