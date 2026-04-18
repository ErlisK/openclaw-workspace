// ============================================================
// Quiz domain types
// ============================================================

export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuizQuestion {
  id: string;
  lessonId: string;
  question: string;
  type: QuizQuestionType;
  options: string[] | null;         // For multiple_choice
  correctIndex: number | null;      // For multiple_choice (0-based)
  correctBool: boolean | null;      // For true_false
  explanation: string | null;
  orderIndex: number;
  aiGenerated: boolean;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  lessonId: string;
  questionId: string;
  selectedIndex: number | null;     // multiple_choice
  selectedBool: boolean | null;     // true_false
  selectedText: string | null;      // short_answer
  isCorrect: boolean;
  attemptNumber: number;
  attemptedAt: string;
}

export interface QuizResult {
  lessonId: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePct: number;
  passed: boolean;
  attemptNumber: number;
}

/** Parsed from YAML frontmatter — matches course-starter lesson format */
export interface QuizFrontmatter {
  question: string;
  type: QuizQuestionType;
  options?: string[];
  correct: number | boolean;
  explanation?: string;
}
