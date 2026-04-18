# @teachrepo/core

Shared course parsing and validation logic used by both `apps/web` and `apps/cli`.

## Exports

- `parseCourse(dir: string): Course` — reads `course.config.yaml` + all lesson files
- `parseLesson(file: string): Lesson` — parses a single Markdown lesson with YAML frontmatter
- `validateCourse(course: Course): ValidationResult` — validates schema, quiz structure, ordering
- `CourseSchema` — Zod schema for `course.config.yaml`
- `LessonSchema` — Zod schema for lesson frontmatter
- Types: `Course`, `Lesson`, `QuizQuestion`, `CourseConfig`
