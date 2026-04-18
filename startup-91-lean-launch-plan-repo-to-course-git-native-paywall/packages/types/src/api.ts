// ============================================================
// API request/response contract types
// Used by both apps/web Route Handlers and packages/cli
// ============================================================

// --- Checkout ---

export interface CreateCheckoutSessionRequest {
  courseId: string;
  affiliateRef?: string;
}

export interface CreateCheckoutSessionResponse {
  url: string;
  sessionId: string;
}

// --- Courses ---

export interface CreateCourseRequest {
  repoUrl?: string;
  title: string;
  description?: string;
  priceCents: number;
  currency?: string;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  priceCents?: number;
  published?: boolean;
  affiliatesEnabled?: boolean;
  affiliateCommissionPct?: number;
}

// --- AI Quiz ---

export interface GenerateQuizRequest {
  lessonId: string;
  lessonContent: string;
  numQuestions?: number;           // Default: 3
}

export interface GenerateQuizResponse {
  questions: Array<{
    question: string;
    type: 'multiple_choice' | 'true_false';
    options?: string[];
    correct: number | boolean;
    explanation: string;
  }>;
  model: string;
  generationMs: number;
}

// --- Generic API responses ---

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
