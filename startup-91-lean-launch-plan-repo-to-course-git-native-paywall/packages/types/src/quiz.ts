// ============================================================
// Quiz domain types (v2 — aligned with course-format.md + schemas.ts)
// ============================================================

export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

/** Base fields shared across all question types */
interface QuizQuestionBase {
  prompt: string;           // The question text / statement
  points: number;           // Point weight for scoring (default 1)
  explanation?: string;     // Shown after student answers
}

export interface MultipleChoiceQuestion extends QuizQuestionBase {
  type: 'multiple_choice';
  choices: string[];        // Min 2, max 6
  answer: number;           // 0-based index of the correct choice
}

export interface TrueFalseQuestion extends QuizQuestionBase {
  type: 'true_false';
  answer: boolean;
}

export interface ShortAnswerQuestion extends QuizQuestionBase {
  type: 'short_answer';
  answer: string;           // Expected answer (case-insensitive match)
}

export type QuizQuestion = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion;

/** A parsed quizzes/{id}.yml file */
export interface QuizFile {
  id: string;               // Must match filename without .yml
  title: string;
  pass_threshold: number;   // 0–100
  ai_generated: boolean;
  questions: QuizQuestion[];
}

/** A quiz attempt record (DB row) */
export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  questionId: string;
  lessonId: string;
  courseId: string;
  selectedIndex: number | null;     // multiple_choice
  selectedBool: boolean | null;     // true_false
  selectedText: string | null;      // short_answer
  isCorrect: boolean;
  attemptNumber: number;
  scorePct: number | null;
  passed: boolean | null;
  attemptedAt: string;
}

/** Result of grading a full quiz attempt */
export interface QuizResult {
  lessonId: string;
  quizId: string;
  totalQuestions: number;
  totalPoints: number;
  earnedPoints: number;
  scorePct: number;
  passed: boolean;
  passThreshold: number;
  attemptNumber: number;
}
