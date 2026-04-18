# @teachrepo/ui

Shared React component library for TeachRepo. Used by `apps/web`. Built with Tailwind CSS and `class-variance-authority` for type-safe variant props.

## Components

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | `variant`, `size` | Primary action button with variants (default, outline, ghost, destructive, link) |
| `Badge` | `variant` | Inline label/tag (default, secondary, success, warning, destructive, outline) |
| `Card` | — | Container card + `CardHeader`, `CardContent`, `CardFooter` sub-components |
| `PriceTag` | `priceCents`, `currency` | Formats and displays a price; shows "Free" for $0 |
| `ProgressBar` | `value`, `max`, `label` | Course/quiz progress bar with optional label and percentage |
| `QuizCard` | `question`, `onAnswer`, ... | Interactive quiz question card with answer state, correct/incorrect feedback, and explanation |
| `LessonCard` | `lesson`, `isCompleted`, `isLocked` | Lesson list item with completion state, preview badge, and lock indicator |
| `CourseCard` | `course`, `lessonCount` | Course grid card with thumbnail, title, tags, price |

## Usage in apps/web

```tsx
import { Button, CourseCard, QuizCard } from '@teachrepo/ui';
```

## Adding a component

1. Create `src/components/MyComponent.tsx`
2. Export it from `src/index.ts`
3. Props interface should be exported for consumers

## Tailwind setup

`apps/web` must include `packages/ui/src/**` in its `tailwind.config.ts` content paths so Tailwind picks up class names from this package:

```ts
// apps/web/tailwind.config.ts
content: [
  './src/**/*.{ts,tsx}',
  '../../packages/ui/src/**/*.{ts,tsx}',
],
```
