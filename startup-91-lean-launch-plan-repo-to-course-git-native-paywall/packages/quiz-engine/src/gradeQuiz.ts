import type { QuizFile, QuizQuestion, QuizResult } from '@teachrepo/types';

export type { QuizResult };
export type { QuizFile, QuizQuestion };

export interface QuizAnswerInput {
  questionIndex: number;
  selectedIndex?: number;     // multiple_choice
  selectedBool?: boolean;     // true_false
  selectedText?: string;      // short_answer
}

/**
 * Grade a set of quiz answers against the quiz's correct answers.
 * Uses weighted scoring (points field on each question).
 * Returns a QuizResult with score, pass/fail, and per-question correctness.
 */
export function gradeQuiz(
  quiz: QuizFile,
  answers: QuizAnswerInput[],
  lessonId: string,
  attemptNumber = 1
): QuizResult & { isCorrectPerQuestion: boolean[] } {
  const questions = quiz.questions;

  if (questions.length === 0) {
    return {
      lessonId,
      quizId: quiz.id,
      totalQuestions: 0,
      totalPoints: 0,
      earnedPoints: 0,
      scorePct: 100,
      passed: true,
      passThreshold: quiz.pass_threshold,
      attemptNumber,
      isCorrectPerQuestion: [],
    };
  }

  const isCorrectPerQuestion = questions.map((q, i) => {
    const answer = answers.find((a) => a.questionIndex === i);
    if (!answer) return false;
    return isAnswerCorrect(q, answer);
  });

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = questions.reduce((sum, q, i) => {
    return sum + (isCorrectPerQuestion[i] ? q.points : 0);
  }, 0);

  const scorePct = totalPoints === 0 ? 100 : Math.round((earnedPoints / totalPoints) * 100);

  return {
    lessonId,
    quizId: quiz.id,
    totalQuestions: questions.length,
    totalPoints,
    earnedPoints,
    scorePct,
    passed: scorePct >= quiz.pass_threshold,
    passThreshold: quiz.pass_threshold,
    attemptNumber,
    isCorrectPerQuestion,
  };
}

function isAnswerCorrect(q: QuizQuestion, answer: QuizAnswerInput): boolean {
  switch (q.type) {
    case 'multiple_choice':
      return typeof answer.selectedIndex === 'number' && answer.selectedIndex === q.answer;

    case 'true_false':
      return typeof answer.selectedBool === 'boolean' && answer.selectedBool === q.answer;

    case 'short_answer':
      return (
        typeof answer.selectedText === 'string' &&
        answer.selectedText.trim().toLowerCase() === q.answer.trim().toLowerCase()
      );

    default:
      return false;
  }
}
