# @teachrepo/types

Shared TypeScript type definitions for TeachRepo. Used by all workspaces — `apps/web`, `packages/cli`, `packages/core`, and `packages/quiz-engine`.

## Source files

| File | Contents |
|------|----------|
| `src/course.ts` | `Course`, `Lesson`, `CourseConfig`, `PricingModel` |
| `src/user.ts` | `User`, `SaasTier` |
| `src/enrollment.ts` | `Enrollment`, `isEntitlementActive()` |
| `src/quiz.ts` | `QuizQuestion`, `QuizAttempt`, `QuizResult`, `QuizFrontmatter` |
| `src/affiliate.ts` | `Affiliate`, `AffiliateClick`, `AffiliateConversion` |
| `src/analytics.ts` | `AnalyticsEventName`, `AnalyticsEvent`, per-event property shapes |
| `src/api.ts` | Request/response contracts for all Route Handlers |

## Usage

```typescript
import type { Course, Lesson, QuizQuestion } from '@teachrepo/types';
import type { CreateCheckoutSessionRequest } from '@teachrepo/types';
```

## Design notes

- Types are source-imported (no build step) — `main` points to `src/index.ts`
- All field names use `camelCase` in TypeScript (mapped from `snake_case` in DB)
- API contracts in `api.ts` are used by both the web app Route Handlers and the CLI HTTP client
- No runtime code — this package is types only
