// Inline types — avoids @teachrepo/* workspace package deps in Vercel build

export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface MultipleChoiceQuestion {
  type: 'multiple_choice';
  prompt: string;
  choices: string[];
  answer: number;
  points: number;
  explanation?: string;
}

export interface TrueFalseQuestion {
  type: 'true_false';
  prompt: string;
  answer: boolean;
  points: number;
  explanation?: string;
}

export interface ShortAnswerQuestion {
  type: 'short_answer';
  prompt: string;
  answer: string;
  points: number;
  explanation?: string;
}

export type QuizQuestion = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion;

export interface QuizFile {
  id: string;
  title: string;
  pass_threshold: number;
  ai_generated: boolean;
  questions: QuizQuestion[];
}
