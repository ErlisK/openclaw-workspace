'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import type { QuizFile, QuizQuestion } from '@teachrepo/types';

interface QuizProps {
  quiz: QuizFile;
  lessonId: string;
  courseId: string;
  /** Pass attempt number in (for multi-attempt tracking) */
  attemptNumber?: number;
  onComplete?: (scorePct: number, passed: boolean) => void;
}

type AnswerState = Record<
  number,
  { selectedIndex?: number; selectedBool?: boolean; selectedText?: string }
>;

export function Quiz({ quiz, lessonId, courseId, attemptNumber = 1, onComplete }: QuizProps) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    scorePct: number;
    passed: boolean;
    isCorrect: boolean[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswer = useCallback(
    (
      questionIndex: number,
      answer: { selectedIndex?: number; selectedBool?: boolean; selectedText?: string }
    ) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
    },
    [submitted]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setError(null);

    const answerList = quiz.questions.map((_, i) => ({
      questionIndex: i,
      ...answers[i],
    }));

    try {
      const res = await fetch('/api/quiz-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          lessonId,
          courseId,
          attemptNumber,
          answers: answerList,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult({
        scorePct: data.scorePct,
        passed: data.passed,
        isCorrect: data.isCorrectPerQuestion ?? [],
      });
      setSubmitted(true);
      onComplete?.(data.scorePct, data.passed);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [quiz, answers, lessonId, courseId, attemptNumber, submitting, submitted, onComplete]);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === quiz.questions.length;

  return (
    <div className="my-8 rounded-xl border border-violet-200 bg-violet-50 p-6 dark:border-violet-800 dark:bg-violet-950/30">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-violet-900 dark:text-violet-100">
          {quiz.title}
        </h3>
        <span className="text-sm text-violet-600 dark:text-violet-400">
          {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
          {' · '}pass at {quiz.pass_threshold}%
        </span>
      </div>

      <div className="space-y-8">
        {quiz.questions.map((q, i) => (
          <QuestionBlock
            key={i}
            question={q}
            index={i}
            answer={answers[i]}
            submitted={submitted}
            isCorrect={result?.isCorrect[i]}
            onAnswer={(a) => handleAnswer(i, a)}
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="mt-6 w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Grading…' : 'Submit Answers'}
        </button>
      )}

      {result && (
        <QuizResult
          scorePct={result.scorePct}
          passed={result.passed}
          passThreshold={quiz.pass_threshold}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuestionBlock({
  question,
  index,
  answer,
  submitted,
  isCorrect,
  onAnswer,
}: {
  question: QuizQuestion;
  index: number;
  answer: AnswerState[number] | undefined;
  submitted: boolean;
  isCorrect: boolean | undefined;
  onAnswer: (a: AnswerState[number]) => void;
}) {
  return (
    <div>
      <p className="mb-3 font-medium text-gray-900 dark:text-gray-100">
        <span className="mr-2 font-mono text-violet-500">{index + 1}.</span>
        {question.prompt}
      </p>

      {question.type === 'multiple_choice' && (
        <div className="space-y-2">
          {question.choices.map((choice, ci) => {
            const selected = answer?.selectedIndex === ci;
            const correct = submitted && ci === (question as { answer: number }).answer;
            const wrong = submitted && selected && !correct;
            return (
              <button
                key={ci}
                onClick={() => onAnswer({ selectedIndex: ci })}
                disabled={submitted}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                  correct
                    ? 'border-green-400 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-950 dark:text-green-200'
                    : wrong
                    ? 'border-red-400 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-950 dark:text-red-200'
                    : selected
                    ? 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950'
                    : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50 dark:border-gray-700'
                }`}
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                  {String.fromCharCode(65 + ci)}
                </span>
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="flex gap-3">
          {[true, false].map((val) => {
            const selected = answer?.selectedBool === val;
            const correct = submitted && val === (question as { answer: boolean }).answer;
            const wrong = submitted && selected && !correct;
            return (
              <button
                key={String(val)}
                onClick={() => onAnswer({ selectedBool: val })}
                disabled={submitted}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  correct
                    ? 'border-green-400 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                    : wrong
                    ? 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                    : selected
                    ? 'border-violet-400 bg-violet-100 dark:bg-violet-950'
                    : 'border-gray-200 hover:border-violet-300 dark:border-gray-700'
                }`}
              >
                {val ? 'True' : 'False'}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'short_answer' && (
        <input
          type="text"
          disabled={submitted}
          value={answer?.selectedText ?? ''}
          onChange={(e) => onAnswer({ selectedText: e.target.value })}
          placeholder="Type your answer…"
          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 ${
            submitted
              ? isCorrect
                ? 'border-green-400 bg-green-50 dark:bg-green-950'
                : 'border-red-400 bg-red-50 dark:bg-red-950'
              : ''
          }`}
        />
      )}

      {submitted && question.explanation && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{isCorrect ? '✓ Correct.' : '✗ Incorrect.'}</span>{' '}
          {question.explanation}
        </p>
      )}
    </div>
  );
}

function QuizResult({
  scorePct,
  passed,
  passThreshold,
}: {
  scorePct: number;
  passed: boolean;
  passThreshold: number;
}) {
  return (
    <div
      className={`mt-6 rounded-lg p-4 text-center ${
        passed
          ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
      }`}
    >
      <p className="text-2xl font-bold">{scorePct}%</p>
      <p className="mt-1 text-sm font-medium">
        {passed
          ? '🎉 You passed! Great work.'
          : `Almost! You need ${passThreshold}% to pass. Review the lesson and try again.`}
      </p>
    </div>
  );
}
