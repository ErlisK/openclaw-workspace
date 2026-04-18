import type { QuizFrontmatter, QuizResult } from '@teachrepo/types';

export type { QuizResult };

export interface QuizAttemptInput {
  questionIndex: number;
  selectedIndex?: number;     // multiple_choice
  selectedBool?: boolean;     // true_false
  selectedText?: string;      // short_answer
}

/**
 * Grade a set of quiz answers against the correct answers.
 * Returns a QuizResult with score, pass/fail, and per-question correctness.
 */
export function gradeQuiz(
  lessonId: string,
  questions: QuizFrontmatter[],
  answers: QuizAttemptInput[],
  passThreshold = 70
): QuizResult & { isCorrectPerQuestion: boolean[] } {
  if (questions.length === 0) {
    return {
      lessonId,
      totalQuestions: 0,
      correctAnswers: 0,
      scorePct: 100,
      passed: true,
      attemptNumber: 1,
      isCorrectPerQuestion: [],
    };
  }

  const isCorrectPerQuestion = questions.map((q, i) => {
    const answer = answers.find((a) => a.questionIndex === i);
    if (!answer) return false;

    switch (q.type) {
      case 'multiple_choice':
        return typeof q.correct === 'number' && answer.selectedIndex === q.correct;
      case 'true_false':
        return typeof q.correct === 'boolean' && answer.selectedBool === q.correct;
      case 'short_answer':
        // Short answer: case-insensitive exact match for now
        return (
          typeof q.correct === 'string' &&
          answer.selectedText?.trim().toLowerCase() ===
            String(q.correct).trim().toLowerCase()
        );
      default:
        return false;
    }
  });

  const correctAnswers = isCorrectPerQuestion.filter(Boolean).length;
  const scorePct = Math.round((correctAnswers / questions.length) * 100);

  return {
    lessonId,
    totalQuestions: questions.length,
    correctAnswers,
    scorePct,
    passed: scorePct >= passThreshold,
    attemptNumber: 1, // Caller increments this
    isCorrectPerQuestion,
  };
}
