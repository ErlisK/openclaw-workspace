# FocusDo — Keyboard-first task manager

> Capture. Focus. Done. In under 60 seconds.

**Live app:** [Deployed on Vercel]

---

## What is this?

FocusDo is a lean MVP for a keyboard-first todo app with a hard 3-task **Focus Mode**.
Built to validate three hypotheses in 48 hours:

| Hypothesis | Metric | Target |
|-----------|--------|--------|
| **H1** Keyboard-first + Focus Mode enables fast task completion | Median capture→done time | < 60 s |
| **H2** Users prefer keyboard over mouse | % of completions via keyboard | ≥ 70 % |
| **H3** App is stable | Error rate over 48 h | < 1 % |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` / `/` | New task |
| `F` | Toggle Focus Mode (top 3 tasks) |
| `J` / `↓` | Select next task |
| `K` / `↑` | Select previous task |
| `Space` / `X` | Complete selected task |
| `D` / `Delete` | Delete selected task |
| `E` | Edit selected task |
| `1` / `2` / `3` | Set priority (High / Medium / Low) |
| `?` | Show keyboard shortcut help |
| `Esc` | Deselect / cancel |

---

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS**
- **localStorage** — task persistence + analytics ring-buffer
- **Vercel** — deployment

No backend. No auth. No database. Just ship.

---

## Docs

| Document | Description |
|----------|-------------|
| [`docs/mvp-spec.md`](docs/mvp-spec.md) | MVP one-pager, user stories, hotkey map, cut list |
| [`docs/adr-001.md`](docs/adr-001.md) | Architecture Decision Record |
| [`docs/erd.md`](docs/erd.md) | Entity-Relationship Diagram |
| [`docs/event-schema.md`](docs/event-schema.md) | Analytics event schema |
| [`docs/acceptance-criteria.md`](docs/acceptance-criteria.md) | AC + cut list (locked) |

---

## Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deploy

```bash
npx vercel --prod
```
