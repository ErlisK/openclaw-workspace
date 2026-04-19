'use client';

import { useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  hasContent?: boolean;
}

type Step = 'idle' | 'generating' | 'review' | 'saving' | 'saved' | 'error';

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
    >
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuizGenerator({
  courseId,
  lessonId,
  lessonSlug,
  lessonTitle,
  existingQuizSlug,
  hasContent = true,
}: QuizGeneratorProps) {
  const [step, setStep] = useState<Step>('idle');
  const [numQuestions, setNumQuestions] = useState(3);
  const [generated, setGenerated] = useState<GeneratedQuiz | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<GeneratedQuestion[]>([]);
  const [yaml, setYaml] = useState('');
  const [savedResult, setSavedResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showYaml, setShowYaml] = useState(false);

  const generate = useCallback(async () => {
    setStep('generating');
    setError(null);

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, numQuestions, quizId: `${lessonSlug}-quiz` }),
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
    setEditedQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
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
    setEditedQuestions((prev) => prev.map((q, i) => (i !== qIdx ? q : { ...q, answer: answerIdx })));
  };

  const removeQuestion = (idx: number) => {
    setEditedQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    setEditedQuestions((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const saveQuiz = async () => {
    if (editedQuestions.length === 0) {
      setError('Add at least one question before saving.');
      return;
    }
    setStep('saving');
    setError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: generated!.quizId, title: generated!.title, questions: editedQuestions, yaml }),
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
            ✨ AI Quiz Generator
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {existingQuizSlug ? 'Regenerate quiz from lesson content' : 'Generate MCQs from this lesson using Claude'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {existingQuizSlug && step !== 'saved' && step !== 'review' && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              ⚠ Replaces existing quiz
            </span>
          )}
          {step === 'review' && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              {editedQuestions.length} question{editedQuestions.length !== 1 ? 's' : ''}
            </span>
          )}
          {step === 'saved' && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      <div className="p-6">

        {/* ── IDLE / ERROR ─────────────────────────────────────────────── */}
        {(step === 'idle' || step === 'error') && (
          <div className="space-y-4">
            {/* No content warning */}
            {!hasContent && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <p className="font-medium">No lesson content found</p>
                  <p className="text-xs mt-0.5 text-amber-700">Import or add lesson content first — the AI reads the Markdown to generate relevant questions.</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Questions:</label>
                <div className="flex items-center gap-1">
                  {[1, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumQuestions(n)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        numQuestions === n
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">Generation failed</p>
                <p className="mt-0.5 text-xs">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={generate}
                disabled={!hasContent}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                data-testid="generate-quiz-btn"
              >
                <span>✨</span>
                <span>{existingQuizSlug ? 'Regenerate quiz' : 'Generate quiz from lesson'}</span>
              </button>
              {step === 'error' && (
                <button type="button" onClick={() => setStep('idle')} className="text-sm text-gray-400 hover:text-gray-600">
                  Reset
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              Powered by Vercel AI Gateway (Claude). Only works on deployed Vercel instances.
            </p>
          </div>
        )}

        {/* ── GENERATING ───────────────────────────────────────────────── */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10" data-testid="generating-spinner">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <p className="text-sm text-gray-600 font-medium">
              Generating {numQuestions} question{numQuestions !== 1 ? 's' : ''} with Claude…
            </p>
            <p className="text-xs text-gray-400">Reading lesson: <em>{lessonTitle}</em></p>
          </div>
        )}

        {/* ── REVIEW ───────────────────────────────────────────────────── */}
        {step === 'review' && generated && (
          <div className="space-y-5" data-testid="quiz-review">
            {/* Quiz title + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Quiz title</p>
                <p className="font-semibold text-gray-800 mt-0.5">{generated.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('idle'); setGenerated(null); }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ↩ Regenerate
                </button>
                <button
                  type="button"
                  onClick={saveQuiz}
                  disabled={editedQuestions.length === 0}
                  className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm"
                  data-testid="save-quiz-btn"
                >
                  Save quiz ({editedQuestions.length}Q) →
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {editedQuestions.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
                All questions removed. <button type="button" onClick={() => setEditedQuestions(generated.questions)} className="text-violet-600 hover:underline">Restore original</button>
              </div>
            )}

            {/* Questions editor */}
            <div className="space-y-3">
              {editedQuestions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3"
                  data-testid={`question-${qIdx}`}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                        {qIdx + 1}
                      </span>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {q.type === 'multiple_choice' ? 'Multiple choice' : 'True / False'}
                      </span>
                      <span className="text-xs text-gray-400">· {q.points} pt</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Move up/down */}
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIdx, -1)}
                        disabled={qIdx === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                        title="Move up"
                      >↑</button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIdx, 1)}
                        disabled={qIdx === editedQuestions.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                        title="Move down"
                      >↓</button>
                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIdx)}
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Remove question"
                      >✕</button>
                    </div>
                  </div>

                  {/* Prompt */}
                  <textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(qIdx, 'prompt', e.target.value)}
                    rows={2}
                    placeholder="Question text…"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 resize-none"
                    data-testid={`question-${qIdx}-prompt`}
                  />

                  {/* MCQ choices */}
                  {q.type === 'multiple_choice' && q.choices && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-400">Answer choices — click ● to mark correct</p>
                      {q.choices.map((choice, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCorrectAnswer(qIdx, cIdx)}
                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                              q.answer === cIdx
                                ? 'border-green-500 bg-green-500 text-white'
                                : 'border-gray-300 text-gray-400 hover:border-violet-400 hover:text-violet-600'
                            }`}
                            title={q.answer === cIdx ? 'Correct answer' : 'Mark as correct'}
                          >
                            {q.answer === cIdx ? '✓' : String.fromCharCode(65 + cIdx)}
                          </button>
                          <input
                            type="text"
                            value={choice}
                            onChange={(e) => updateChoice(qIdx, cIdx, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + cIdx)}`}
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
                      <span className="text-sm font-medium text-gray-600">Correct answer:</span>
                      {([true, false] as const).map((val) => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => updateQuestion(qIdx, 'answer', val)}
                          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                            q.answer === val
                              ? 'bg-green-500 text-white shadow-sm'
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
                    <label className="mb-1 block text-xs font-medium text-gray-400">
                      Explanation <span className="font-normal text-gray-300">(shown after answer)</span>
                    </label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                      rows={2}
                      placeholder="Why is this the correct answer?"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 focus:border-violet-400 focus:outline-none resize-none"
                      data-testid={`question-${qIdx}-explanation`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* YAML panel */}
            <div className="rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between px-4 py-2">
                <button
                  type="button"
                  onClick={() => setShowYaml(!showYaml)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  {showYaml ? '▾' : '▸'} View YAML
                </button>
                <CopyButton text={yaml} label="Copy YAML" />
              </div>
              {showYaml && (
                <textarea
                  value={yaml}
                  onChange={(e) => setYaml(e.target.value)}
                  rows={16}
                  className="w-full rounded-b-xl border-t border-gray-100 bg-white px-4 py-3 font-mono text-xs text-gray-700 focus:outline-none"
                  data-testid="yaml-editor"
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        )}

        {/* ── SAVING ───────────────────────────────────────────────────── */}
        {step === 'saving' && (
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <span className="text-sm text-gray-500">Saving quiz…</span>
          </div>
        )}

        {/* ── SAVED ────────────────────────────────────────────────────── */}
        {step === 'saved' && savedResult && (
          <div className="space-y-4" data-testid="quiz-saved">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                ✅ Quiz saved — {savedResult.questionsCreated} question{savedResult.questionsCreated !== 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-xs text-green-600 font-mono">{savedResult.quizSlug}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={`/courses/${lessonSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-violet-600 hover:underline"
              >
                Preview lesson ↗
              </a>
              <button
                type="button"
                onClick={() => { setStep('idle'); setGenerated(null); setSavedResult(null); }}
                className="text-sm text-gray-400 hover:text-gray-600"
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
