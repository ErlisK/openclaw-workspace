'use client';
import * as React from 'react';
import { useState } from 'react';

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
  lessonId: string;
}

type Answer = number | boolean | string | null;

export function Quiz({ quizId, title, passThreshold, questions, courseId, lessonId }: QuizProps) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
    feedback: Record<string, { correct: boolean; explanation: string | null }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allAnswered = questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== null);

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
        body: JSON.stringify({ quiz_id: quizId, course_id: courseId, lesson_id: lessonId, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit quiz');
      } else {
        setResult(data);
        setSubmitted(true);
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

  if (submitted && result) {
    return (
      <div className="my-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Result header */}
        <div className={`px-6 py-5 ${result.passed ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{result.passed ? '🎉' : '😅'}</span>
            <div>
              <h3 className={`text-lg font-bold ${result.passed ? 'text-green-900' : 'text-red-900'}`}>
                {result.passed ? 'Quiz passed!' : 'Not quite — try again'}
              </h3>
              <p className={`text-sm ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                {result.correct}/{result.total} correct · {result.score}% (need {passThreshold}%)
              </p>
            </div>
          </div>
        </div>

        {/* Per-question feedback */}
        <div className="divide-y divide-gray-100 px-6">
          {questions.map((q, i) => {
            const fb = result.feedback[q.id];
            return (
              <div key={q.id} className="py-4">
                <div className="flex gap-2">
                  <span className={`mt-0.5 flex-shrink-0 text-lg ${fb?.correct ? '✅' : '❌'}`}>
                    {fb?.correct ? '✅' : '❌'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{i + 1}. {q.question}</p>
                    {q.question_type === 'multiple_choice' && (
                      <p className="mt-1 text-xs text-gray-500">
                        Your answer: <span className={fb?.correct ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                          {q.options?.[answers[q.id] as number] ?? '—'}
                        </span>
                        {!fb?.correct && q.correct_index !== null && (
                          <span className="ml-2 text-green-700 font-medium">Correct: {q.options?.[q.correct_index]}</span>
                        )}
                      </p>
                    )}
                    {q.question_type === 'true_false' && (
                      <p className="mt-1 text-xs text-gray-500">
                        Your answer: <span className={fb?.correct ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                          {answers[q.id] ? 'True' : 'False'}
                        </span>
                        {!fb?.correct && (
                          <span className="ml-2 text-green-700 font-medium">Correct: {q.correct_bool ? 'True' : 'False'}</span>
                        )}
                      </p>
                    )}
                    {fb?.explanation && (
                      <p className="mt-1 text-xs italic text-gray-500">{fb.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!result.passed && (
          <div className="px-6 pb-5">
            <button
              onClick={handleRetry}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 shadow-sm">
      {/* Header */}
      <div className="border-b border-violet-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧪</span>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{questions.length} questions · {passThreshold}% to pass</p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="divide-y divide-violet-100 px-6">
        {questions.map((q, i) => (
          <div key={q.id} className="py-5">
            <p className="mb-3 text-sm font-semibold text-gray-800">{i + 1}. {q.question}</p>

            {q.question_type === 'multiple_choice' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      answers[q.id] === oi
                        ? 'border-violet-500 bg-violet-100 text-violet-900'
                        : 'border-gray-200 bg-white hover:border-violet-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={oi}
                      checked={answers[q.id] === oi}
                      onChange={() => handleAnswer(q.id, oi)}
                      className="accent-violet-600"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.question_type === 'true_false' && (
              <div className="flex gap-3">
                {[true, false].map((val) => (
                  <label
                    key={String(val)}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                      answers[q.id] === val
                        ? 'border-violet-500 bg-violet-100 text-violet-900'
                        : 'border-gray-200 bg-white hover:border-violet-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === val}
                      onChange={() => handleAnswer(q.id, val)}
                      className="accent-violet-600"
                    />
                    {val ? 'True' : 'False'}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="border-t border-violet-200 px-6 py-4">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || loading}
          className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Grading…' : !allAnswered ? `Answer all ${questions.length} questions` : 'Submit quiz →'}
        </button>
      </div>
    </div>
  );
}
