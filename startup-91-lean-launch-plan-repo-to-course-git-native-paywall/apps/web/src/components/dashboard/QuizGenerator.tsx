'use client';

import { useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MCQOption {
  text: string;
  isCorrect: boolean;
}

interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false';
  prompt: string;
  choices?: string[];
  answer: number | boolean;
  explanation: string;
  points: number;
}

interface GeneratedQuiz {
  title: string;
  quizId: string;
  yaml: string;
  questions: GeneratedQuestion[];
}

interface SaveResult {
  quizId: string;
  quizSlug: string;
  questionsCreated: number;
}

interface QuizGeneratorProps {
  courseId: string;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  existingQuizSlug?: string | null;
}

type Step = 'idle' | 'generating' | 'review' | 'saving' | 'saved' | 'error';

// ── Main component ────────────────────────────────────────────────────────────

export function QuizGenerator({
  courseId,
  lessonId,
  lessonSlug,
  lessonTitle,
  existingQuizSlug,
}: QuizGeneratorProps) {
  const [step, setStep] = useState<Step>('idle');
  const [numQuestions, setNumQuestions] = useState(3);
  const [generated, setGenerated] = useState<GeneratedQuiz | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<GeneratedQuestion[]>([]);
  const [yaml, setYaml] = useState('');
  const [savedResult, setSavedResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setStep('generating');
    setError(null);

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          numQuestions,
          quizId: `${lessonSlug}-quiz`,
        }),
      });

      const data = await res.json() as GeneratedQuiz & { error?: string; hint?: string };

      if (!res.ok) {
        if (res.status === 503) {
          setError(`AI quiz generation requires a deployed Vercel instance. ${data.hint ?? ''}`);
        } else {
          setError(data.error ?? `Generation failed (HTTP ${res.status})`);
        }
        setStep('error');
        return;
      }

      setGenerated(data);
      setEditedQuestions(data.questions ?? []);
      setYaml(data.yaml ?? '');
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setStep('error');
    }
  }, [lessonId, lessonSlug, numQuestions]);

  const updateQuestion = (idx: number, field: keyof GeneratedQuestion, value: unknown) => {
    setEditedQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    );
  };

  const updateChoice = (qIdx: number, cIdx: number, text: string) => {
    setEditedQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx || q.type !== 'multiple_choice') return q;
        const newChoices = [...(q.choices ?? [])];
        newChoices[cIdx] = text;
        return { ...q, choices: newChoices };
      }),
    );
  };

  const setCorrectAnswer = (qIdx: number, answerIdx: number) => {
    setEditedQuestions((prev) =>
      prev.map((q, i) => (i !== qIdx ? q : { ...q, answer: answerIdx })),
    );
  };

  const saveQuiz = async () => {
    setStep('saving');
    setError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: generated!.quizId,
          title: generated!.title,
          questions: editedQuestions,
          yaml,
        }),
      });

      const data = await res.json() as SaveResult & { error?: string };

      if (!res.ok) {
        setError(data.error ?? `Save failed (HTTP ${res.status})`);
        setStep('review');
        return;
      }

      setSavedResult(data);
      setStep('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setStep('review');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden" data-testid="quiz-generator">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            AI Quiz Generator
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Generate MCQs from this lesson using Claude
          </p>
        </div>
        {existingQuizSlug && step !== 'saved' && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            ⚠ Will replace existing quiz
          </span>
        )}
        {step === 'saved' && savedResult && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            ✓ Quiz saved
          </span>
        )}
      </div>

      <div className="p-6">

        {/* ── IDLE — config + generate ──────────────────────────────────── */}
        {(step === 'idle' || step === 'error') && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Questions
              </label>
              <div className="flex items-center gap-1">
                {[1, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumQuestions(n)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      numQuestions === n
                        ? 'bg-violet-600 text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={generate}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 active:scale-[0.98] transition-all"
              data-testid="generate-quiz-btn"
            >
              <span>✨</span>
              <span>Generate quiz from lesson</span>
            </button>

            <p className="text-xs text-gray-400">
              Uses Vercel AI Gateway (Claude Haiku). Only works on deployed instances.
            </p>
          </div>
        )}

        {/* ── GENERATING — spinner ──────────────────────────────────────── */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10" data-testid="generating-spinner">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <p className="text-sm text-gray-500">
              Generating {numQuestions} question{numQuestions !== 1 ? 's' : ''} with Claude…
            </p>
          </div>
        )}

        {/* ── REVIEW — edit + save ──────────────────────────────────────── */}
        {step === 'review' && generated && (
          <div className="space-y-6" data-testid="quiz-review">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{generated.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('idle')}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  ↩ Regenerate
                </button>
                <button
                  onClick={saveQuiz}
                  className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                  data-testid="save-quiz-btn"
                >
                  Save quiz
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Questions editor */}
            <div className="space-y-4">
              {editedQuestions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3"
                  data-testid={`question-${qIdx}`}
                >
                  {/* Question number + type */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Q{qIdx + 1} · {q.type === 'multiple_choice' ? 'Multiple choice' : 'True / False'}
                    </span>
                    <span className="text-xs text-gray-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Prompt */}
                  <textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(qIdx, 'prompt', e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                    data-testid={`question-${qIdx}-prompt`}
                  />

                  {/* MCQ choices */}
                  {q.type === 'multiple_choice' && q.choices && (
                    <div className="space-y-2">
                      {q.choices.map((choice, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <button
                            onClick={() => setCorrectAnswer(qIdx, cIdx)}
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs transition-colors ${
                              q.answer === cIdx
                                ? 'border-green-500 bg-green-500 text-white'
                                : 'border-gray-300 text-gray-300 hover:border-violet-400'
                            }`}
                            title={q.answer === cIdx ? 'Correct answer' : 'Set as correct'}
                          >
                            {q.answer === cIdx ? '✓' : String.fromCharCode(65 + cIdx)}
                          </button>
                          <input
                            type="text"
                            value={choice}
                            onChange={(e) => updateChoice(qIdx, cIdx, e.target.value)}
                            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-violet-400 focus:outline-none"
                            data-testid={`question-${qIdx}-choice-${cIdx}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* True/False */}
                  {q.type === 'true_false' && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Correct answer:</span>
                      {[true, false].map((val) => (
                        <button
                          key={String(val)}
                          onClick={() => updateQuestion(qIdx, 'answer', val)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            q.answer === val
                              ? 'bg-green-500 text-white'
                              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {val ? 'True' : 'False'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">Explanation</label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 focus:border-violet-400 focus:outline-none"
                      data-testid={`question-${qIdx}-explanation`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Raw YAML toggle */}
            <details className="rounded-xl border border-gray-100">
              <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700">
                View / edit YAML
              </summary>
              <textarea
                value={yaml}
                onChange={(e) => setYaml(e.target.value)}
                rows={20}
                className="w-full rounded-b-xl border-t border-gray-100 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-700 focus:outline-none"
                data-testid="yaml-editor"
              />
            </details>
          </div>
        )}

        {/* ── SAVING ────────────────────────────────────────────────────── */}
        {step === 'saving' && (
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <span className="text-sm text-gray-500">Saving quiz…</span>
          </div>
        )}

        {/* ── SAVED ─────────────────────────────────────────────────────── */}
        {step === 'saved' && savedResult && (
          <div className="space-y-4" data-testid="quiz-saved">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                ✅ Quiz saved — {savedResult.questionsCreated} question{savedResult.questionsCreated !== 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-xs text-green-600">
                Quiz ID: <code className="font-mono">{savedResult.quizSlug}</code>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/courses/${lessonSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-violet-600 hover:underline"
              >
                Preview lesson with quiz ↗
              </a>
              <button
                onClick={() => {
                  setStep('idle');
                  setGenerated(null);
                  setSavedResult(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Generate another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
