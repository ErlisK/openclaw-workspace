// TeachRepo — Shared TypeScript Types (v2)
// Re-export all domain types from this barrel file.

export * from './course';      // Creator, Course, CourseVersion, Lesson, RepoImport, CourseConfig
export * from './enrollment';  // Purchase, Enrollment, isEntitlementActive
export * from './quiz';        // QuizQuestion, QuizAttempt, QuizResult, QuizFrontmatter
export * from './affiliate';   // Affiliate, Referral
export * from './analytics';   // AnalyticsEventName, AnalyticsEvent, per-event property shapes
export * from './api';         // API request/response contracts
