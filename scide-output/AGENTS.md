# Operating Rules

These rules are mandatory. Follow them in every task, every step, no exceptions.

## Security

- **Never hardcode secrets.** Always reference environment variables: `$SECRET_NAME` in shell, `process.env.SECRET_NAME` in code.
- **Never expose secret keys in client-side code.** Only `NEXT_PUBLIC_*` variables are safe for the browser. Server-side secrets stay in API routes.
- **Never commit `.env` files or secrets to git.** Use `.gitignore` to exclude them.
- **Never log secret values.** Log the key name if needed, never the value.

## Deployment

- **Always deploy via `vercel --prod --token $VERCEL_TOKEN --scope $VERCEL_TEAM_SLUG --yes`** from inside your pre-linked project directory. The `--scope` flag is **mandatory** — without it the CLI may target a different team.
- **Never run `vercel login`, `vercel logout`, or `vercel link`** — the project is already linked. See "Workspace (PRE-CONFIGURED)" below.
- **Set environment variables in Vercel before deploying**: `vercel env add NAME` for each required secret.
- **If a custom domain is provided in your task context**, add it after deploying: `vercel domains add <domain>`. DNS is configured server-side.
- **Always test the deployed URL** after deployment. Visit it, check for errors.

## Payment Integration

- When `STRIPE_SECRET_KEY` is available, **use the pre-built payment templates** at `/opt/scide/templates/payments/`.
- Copy templates into your project: `cp -r /opt/scide/templates/payments/* ./` and adapt to your app's structure.
- **Never rewrite Stripe integration logic from scratch** — the templates handle checkout sessions, webhook signature verification, and the customer portal correctly.
- Create Stripe products and prices via the API using `curl` and `$STRIPE_SECRET_KEY`.

## AI / LLM Features

- **LLM access is FREE and zero-config** via Vercel AI Gateway (see `TOOLS.md` → "LLM & AI Features"). Whenever an AI feature would genuinely improve the product (chat, generation, summarization, classification, recommendations, agentic flows, RAG), build it.
- Install with `npm install ai @ai-sdk/gateway zod`. **No API keys to manage** — OIDC auth is automatic in deployed Vercel Functions.
- **Always call LLMs server-side** (Route Handlers, Server Actions, Server Components). Never expose model calls from client-side code.
- **Default model:** `gateway('anthropic/claude-sonnet-4-6')` for most tasks. Use `gateway('anthropic/claude-haiku-4-5')` for cheap/fast classification or routing.
- Reference starter templates at `.ai-gateway-templates/` inside your project, or at `/opt/scide/templates/ai-gateway/`. Copy them into your app and adapt.
- **Test AI endpoints by deploying first, then `curl`ing the deployed URL** — the OIDC token is only injected at Vercel runtime, not during local build.

## Spending

Every time you make a purchase or incur a cost, you **MUST** output a spend tag in this exact format:

```
[SPEND: $AMOUNT | DESCRIPTION | CATEGORY]
```

Examples:
- `[SPEND: $12.00 | Google Workspace registration | domain]`
- `[SPEND: $50.00 | Facebook Ads campaign | marketing]`

Valid categories: `hosting`, `domain`, `marketing`, `tools`, `api`, `design`, `legal`, `other`

If your spending budget is **exhausted**, do NOT attempt any more purchases. Continue with non-spending work only.

## Launch Gate (pre-launch vs post-launch)

Your execution task belongs to **one of two stages** separated by an automated launch gate:

- **Pre-launch phases** cover research, customer discovery, design, building the product, integrating services (auth, payments, database), deployment configuration, bug fixes, and anything needed to make the product LIVE, FUNCTIONAL, and ready for its first real user.
- **Post-launch phases** cover Product Hunt / directory submissions, social media posts, cold outreach, ad campaigns, SEO backlinks, content marketing, partnerships, influencer work, and any traffic/awareness activity.

**Rules:**

- **Never post, publish, announce, submit, or promote in a pre-launch phase.** No Product Hunt, no Twitter/X posts, no Reddit threads, no HackerNews submissions, no directory listings, no ads. These belong to post-launch phases and the platform will run them after the gate passes.
- **Never run marketing or outreach activities in a pre-launch phase**, even if the phase description seems to allow it. If the task description mixes building and promoting, do the building part and stop before the promotion.
- Between pre-launch and post-launch, the platform automatically runs **QA Agent + Security Engine + Product Agent** reviews and decides whether the product is ready. You do **not** need to schedule or trigger these — they happen outside your task.
- If you are asked to run a **fix task** after a gate failure, the task description will include a list of blockers from those three agents. Fix them directly and do not attempt to launch/promote until the gate re-runs.
- The gate retries up to 3 times. After 3 failed attempts the platform launches anyway with known issues — your job in a fix task is to resolve as many blockers as possible, not to skip them.

## Output

- Save all deliverable files (reports, CSVs, specs, analysis) to the current working directory.
- Save copies of key source files to `src/` for the file vault.

## Code Quality & Testing

- Use **TypeScript** for all new code. Avoid `any` types.
- Handle errors at system boundaries (API routes, external calls). Don't over-engineer internal error handling.
- Don't over-engineer. Ship the simplest working solution.

### Mandatory E2E Testing (non-negotiable)

**Every app MUST have Playwright E2E tests.** This is not optional. Tests must cover:

1. **Authentication**: Signup, login, logout, auth guards (unauthenticated redirect)
2. **Core user flow**: The primary job-to-be-done works end-to-end — a new user can sign up and complete the main task
3. **Deployment health**: Homepage loads, no console errors, key API routes respond

**Testing workflow — follow this order for every feature:**
1. Build the feature
2. Write Playwright E2E tests verifying the feature works
3. Run `npm run build` — fix build errors
4. Deploy with `vercel --prod`
5. Run `BASE_URL=https://<deployed-url> npx playwright test` — fix test failures
6. Only move on when all tests pass against the deployed URL

**If tests fail, FIX THE CODE, not the tests** (unless the test itself has a bug). Never skip, delete, or weaken tests to make them pass.

Copy testing templates from `/opt/scide/templates/testing/` — see `TESTING_SETUP.md` there for setup.

### Build verification

Before every deployment:
1. `npm run build` must succeed
2. After deployment, `npx playwright test` must pass against the deployed URL
3. If either fails, fix and redeploy before continuing

## Design & UI

- **Always use a component library** — either **shadcn/ui** or **daisyUI** (see TOOLS.md for setup and when to use each). Never ship pages built from raw HTML and Tailwind utility classes alone.
- **Never ship wireframe-quality or unstyled UI.** Every page must look like a finished, professional product.
- **Every page must be responsive** — test layouts at mobile (375px) and desktop widths.
- **Pick a color palette and stick to it.** Use 1 primary color, 1-2 accent colors, and neutral grays. Apply consistently across all pages.
- **Landing pages require:** hero section with headline + CTA, feature highlights (grid or cards), social proof or benefits section, and a professional footer with links.
- **Use proper visual hierarchy:** large bold headings, medium subheadings, regular body text. Don't make everything the same size.
- **Add polish:** rounded corners on cards/buttons, subtle shadows for depth, hover states on interactive elements, smooth transitions (150-200ms).

## Shell Commands

- **Never use heredocs** (`cat > file << 'EOF'`) — they trigger exec preflight rejection.
- **To create files**, use the file write tool, not shell redirects or heredocs.
- **To run scripts**, use simple direct commands: `python3 /tmp/script.py` or `node /tmp/script.js`.
- **Chained commands** (`&&`, `||`) are allowed, but keep them simple.

## Workspace (PRE-CONFIGURED — DO NOT MODIFY)

Your project folder is **already cloned, already cd'd into, and already wired up** before you start. You are sitting inside:

  `$HOME/.openclaw/workspace/scide-output/openclaw-workspace/<project-slug>/`

The git remote, git author identity (`user.name` + `user.email`), and Vercel project link (`.vercel/project.json`) are all pre-configured by the host. **Treat them as read-only infrastructure.** Your task prompt tells you the exact repo URL, project slug, git identity, and Vercel project ID.

### DO NOT under any circumstances:

- Run `git init` (the repo is already cloned — you'd create a rogue repo)
- Run `git clone <any other URL>`
- Run `git remote set-url`, `git remote add`, or `git remote remove`
- Run `git config user.name` or `git config user.email` (identity is pinned globally)
- Run `gh auth login`, `gh auth logout`, `gh auth setup-git`
- Run `vercel login`, `vercel logout`, or `vercel link --project=<other>`
- Delete or modify `.vercel/project.json`
- `cd` out of your project folder for git/vercel operations
- Create a new GitHub repository for any reason

If something looks misconfigured, **stop and report it** instead of trying to fix it yourself.

### What you SHOULD do:

- `git add . && git commit -m "..." && git push origin main` — these will Just Work and be authored by the pre-pinned identity
- `vercel --prod --token $VERCEL_TOKEN --scope $VERCEL_TEAM_SLUG --yes` — Just Works and deploys to the correct project
- `vercel env add NAME` — runs against the pre-linked project automatically
- `vercel domains add <domain>` — runs against the pre-linked project automatically
- Use `.gitignore` to exclude `node_modules/`, `.next/`, `.env*`, etc.
- Commit meaningful changes with descriptive messages
