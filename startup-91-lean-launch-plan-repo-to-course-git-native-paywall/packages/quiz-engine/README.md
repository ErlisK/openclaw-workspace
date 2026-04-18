# @teachrepo/quiz-engine

YAML quiz parser and auto-grader. Supports multiple-choice, true/false, and short-answer questions defined directly in Markdown YAML frontmatter.

## Quiz YAML Format

```yaml
quiz:
  - question: "What does CI stand for?"
    type: multiple_choice
    options: ["Continuous Integration", "Code Inspection", "Compiled Interface", "Container Image"]
    correct: 0
    explanation: "CI = Continuous Integration — automatically building and testing on each push."

  - question: "Git is a distributed version control system."
    type: true_false
    correct: true
    explanation: "Git is fully distributed — every clone is a full copy of the repository."
```

## Exports

- `parseQuiz(frontmatter: object): QuizQuestion[]` — extract and validate quiz questions
- `gradeQuiz(questions: QuizQuestion[], answers: number[]): QuizResult` — evaluate answers
- `QuizSchema` — Zod schema for quiz frontmatter validation
- Types: `QuizQuestion`, `QuizResult`, `QuizAttempt`
