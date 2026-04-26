# Tools & Environment

## Platform Stack

Software projects use **Next.js** (App Router, TypeScript, Tailwind CSS), deployed on **Vercel**, with **Supabase** for database (PostgreSQL + auth + realtime).

## UI Component Libraries

Always use a component library — never build UI from raw HTML and Tailwind utility classes alone. Choose one based on the project:

### shadcn/ui (custom-branded apps)

Best for: SaaS dashboards, developer tools, data-heavy apps, anything needing a unique brand identity.

```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog input table tabs
```

- Copies components into your project (`components/ui/`) for full customization
- Built on Radix UI primitives + Tailwind CSS
- Gives you complete control over look and feel
- Add components as needed: `npx shadcn@latest add [component]`

### daisyUI (fast, polished themes)

Best for: landing pages, marketing sites, directories, content-heavy apps, MVPs where speed matters.

```bash
npm install daisyui
```

Then add to `tailwind.config.ts`:
```ts
plugins: [require("daisyui")]
```

- Provides semantic class names: `btn`, `btn-primary`, `card`, `hero`, `navbar`, `footer`, `badge`, `modal`
- Built-in themes (light, dark, cupcake, corporate, etc.) — pick one with `daisyui: { themes: ["corporate"] }`
- Minimal setup, instant professional look

### When to use which

| Project type | Library | Why |
|---|---|---|
| SaaS product, dashboard, admin panel | **shadcn/ui** | Needs custom branding, complex interactions |
| Landing page, marketing site | **daisyUI** | Fast setup, built-in themes, semantic classes |
| Content site, blog, directory | **daisyUI** | Theme system handles consistent styling |
| Developer tool, data app | **shadcn/ui** | Better table, dialog, and form primitives |

## Web Browsing

Two headless browsers are pre-installed. Use the right one for the job.

### Lightpanda (fast scraping — try this first)

- Start CDP server: `lightpanda &` (listens on `ws://127.0.0.1:9222`)
- Connect via Puppeteer:
  ```js
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.connect({ browserWSEndpoint: 'ws://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  const text = await page.evaluate(() => document.body.innerText);
  ```
- Best for: scraping pages, extracting text/data, crawling multiple URLs
- 11x faster than Chrome, minimal memory. No visual rendering (no screenshots).

### Playwright + Chromium (full browser)

- Launch:
  ```js
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  ```
- Best for: filling forms, clicking buttons, directory submissions, screenshots, SPAs
- Heavier on memory — always close browser/pages when done.

**Rule of thumb:** Use Lightpanda for research and data extraction. Use Playwright when you need to interact with a page (click, type, submit) or take screenshots.

## E2E Testing (Playwright)

**Every app you build MUST have Playwright E2E tests.** Playwright + Chromium are pre-installed.

### Setup

Copy the testing templates into your project:
```bash
cp /opt/scide/templates/testing/playwright.config.ts ./
mkdir -p e2e
cp /opt/scide/templates/testing/e2e/*.spec.ts ./e2e/
cp -r /opt/scide/templates/testing/e2e/helpers ./e2e/
```

Add the test script to `package.json`:
```json
{ "scripts": { "test:e2e": "playwright test" } }
```

### Running Tests

**Always test against the deployed Vercel URL**, not localhost:
```bash
BASE_URL=https://your-deployed-url.vercel.app npx playwright test
```

Run after every `vercel --prod` deployment. Fix failures before moving on.

### What to Test

Write tests for EVERY user-facing flow you build:

| Flow | What to verify |
|------|---------------|
| **Signup** | Form submits, account created, redirects to app, no error |
| **Login** | Existing user can log in, redirects to authenticated page |
| **Auth guard** | Unauthenticated users redirected to login |
| **Core feature** | The primary job-to-be-done works end-to-end |
| **Payment** | Checkout page loads, Stripe redirect works (test mode) |
| **API routes** | Key endpoints return 2xx, data is correct shape |

### Email Verification Testing

When signup requires email confirmation, use AgentMail to check inboxes:

```typescript
import { waitForEmail, getConfirmationLink } from './helpers/agentmail';

test('signup with email verification', async ({ page }) => {
  const testEmail = `test-${Date.now()}@${process.env.AGENTMAIL_DOMAIN}`;

  // Create AgentMail inbox for this test email
  await fetch('https://api.agentmail.to/v0/inboxes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address: testEmail }),
  });

  await page.goto('/signup');
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');

  // Wait for and click confirmation link
  const link = await getConfirmationLink(testEmail, process.env.AGENTMAIL_API_KEY!);
  await page.goto(link);
  await expect(page).not.toHaveURL(/confirm/);
});
```

### Development + Testing Workflow

For each feature you build:
1. **Build the feature** — implement the functionality
2. **Write Playwright E2E tests** — verify the feature works as expected
3. **Run all tests locally** — ensure nothing broke
4. **Deploy** — push to Vercel
5. **Run tests against deployed URL** — `BASE_URL=https://... npx playwright test`
6. **Fix failures** — if tests fail, fix the code and redeploy. Never move on with failing tests.

## Vercel CLI (project pre-linked — do not `vercel link` or `vercel login`)

The project is pre-linked via `.vercel/project.json` written by the host
before your task started. The CLI knows which project to deploy without
any setup.

- Deploy: `vercel --prod --token $VERCEL_TOKEN --scope $VERCEL_TEAM_SLUG --yes`
- Add env var: `vercel env add SECRET_NAME` (then paste value when prompted)
- Add domain: `vercel domains add example.com`
- Check deployment: `vercel ls --scope $VERCEL_TEAM_SLUG`

**Forbidden:** `vercel login`, `vercel logout`, `vercel link`. Running any of
these will rebind the project folder to the wrong account or project and
break the deploy.

## Payment Templates

Pre-built Stripe payment routes are at `/opt/scide/templates/payments/`:

| File | Purpose |
|------|---------|
| `lib/stripe.ts` | Server-side Stripe client |
| `app/api/checkout/route.ts` | Checkout session creation |
| `app/api/webhooks/stripe/route.ts` | Webhook handler with signature verification |
| `app/api/customer-portal/route.ts` | Customer portal redirect |
| `components/PricingTable.tsx` | Responsive pricing cards |
| `components/CheckoutButton.tsx` | Standalone checkout button |
| `PAYMENT_SETUP.md` | Full setup instructions |

Copy into your project and adapt. See `PAYMENT_SETUP.md` for detailed steps.

## LLM & AI Features (Vercel AI Gateway)

**You have FREE, zero-config access to frontier LLMs via Vercel AI Gateway** in every Next.js app you deploy. No API keys required. Use this to build real AI-powered features (chat, content generation, summarization, classification, agentic workflows, RAG, etc.) whenever they genuinely improve the product.

### How it works

When your Next.js app is deployed to Vercel, every Route Handler / Server Component / Server Action automatically receives a `VERCEL_OIDC_TOKEN` at runtime. The AI Gateway SDK picks this up automatically — **zero configuration, zero secret management**.

### Setup

```bash
npm install ai @ai-sdk/gateway zod
```

### Streaming chat endpoint

```ts
// app/api/ai/chat/route.ts
import { streamText, convertToModelMessages } from 'ai';
import { gateway } from '@ai-sdk/gateway';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: gateway('anthropic/claude-sonnet-4-6'),
    system: 'You are a helpful assistant.',
    messages: convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
```

### One-shot generation

```ts
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';

const { text } = await generateText({
  model: gateway('anthropic/claude-sonnet-4-6'),
  prompt: 'Summarize this article: ' + article,
});
```

### Tool-using agent

```ts
import { generateText, tool, stepCountIs } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from 'zod';

await generateText({
  model: gateway('anthropic/claude-sonnet-4-6'),
  prompt: 'Find the weather in SF and recommend what to wear.',
  tools: {
    getWeather: tool({
      description: 'Get the weather for a city',
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => ({ temp: 68, conditions: 'sunny' }),
    }),
  },
  stopWhen: stepCountIs(5),
});
```

### Client-side chat UI (React)

```tsx
// app/chat/page.tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, sendMessage } = useChat();
  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.parts.map(p => p.type === 'text' ? p.text : '').join('')}</div>
      ))}
      <form onSubmit={e => { e.preventDefault(); const input = (e.target as any).msg.value; sendMessage({ text: input }); }}>
        <input name="msg" />
      </form>
    </div>
  );
}
```

### Model recommendations

| Use case | Model |
|---|---|
| Default / agentic workflows / tool use | `anthropic/claude-sonnet-4-6` |
| Highest-quality long reasoning | `anthropic/claude-opus-4-6` |
| Cheap + fast (classification, routing, short generation) | `anthropic/claude-haiku-4-5` |
| Vision / multimodal | `anthropic/claude-sonnet-4-6` |

### Testing your AI feature

The `VERCEL_OIDC_TOKEN` is only injected at runtime inside deployed Vercel Functions, so the cleanest test loop is:

1. Write the code
2. `npx vercel --prod --token $VERCEL_TOKEN --yes`
3. `curl -X POST https://<your-domain>/api/ai/chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"hello"}]}]}'`
4. If it streams tokens back, it's working. If it fails, check Vercel Function logs.

For iterative local testing: `vercel link --yes --token $VERCEL_TOKEN && vercel env pull .env.local --token $VERCEL_TOKEN` to fetch a 12-hour OIDC token for `npm run dev`.

### Reference templates

Copy-paste starter code is staged at `.ai-gateway-templates/` inside your project directory (or at `/opt/scide/templates/ai-gateway/` in the container). See `.ai-gateway-templates/AI_GATEWAY_SETUP.md` for full setup.

### Billing

All AI Gateway usage is billed centrally to the ScIDE Vercel team. You pay exactly what providers charge, zero markup. **Do not worry about cost tracking** — just build features that add real user value.

## Other Tools

- **AWS CLI**: `aws s3`, `aws secretsmanager`, etc.
- **curl + jq**: REST API calls and JSON processing
- **Node.js 22**: JavaScript/TypeScript runtime
- **Python 3**: Scripting and automation
- **git**: Version control — repo is pre-cloned, remote pre-set, identity pre-pinned. Just `git add/commit/push origin main`. Never `git init`, `git clone`, `git remote *`, or `git config user.*`.
