import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

/**
 * E2E tests for Supabase auth integration:
 * - email/password signup + login UI
 * - Google OAuth button presence (when enabled)
 * - Auth guards (dashboard redirect)
 * - Profile API (/api/me)
 * - Password reset flow
 */

test.describe('Auth pages', () => {
  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('signup page renders email + password fields', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('login page has forgot password link', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });

  test('reset-password page renders', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('dashboard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('invalid login shows error message', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'notreal@example.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should show an error (Supabase returns "Invalid login credentials")
    await expect(page.locator('text=/invalid|incorrect|credentials|error/i')).toBeVisible({ timeout: 8000 });
  });

  test('signup with mismatched weak password shows error', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123'); // too short — minLength=8
    // HTML5 validation should prevent submit; the button should be type=submit
    const btn = page.getByRole('button', { name: /create account/i });
    await btn.click();
    // Either HTML5 validity message or server error
    const isValid = await page.locator('input[type="password"]').evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });
});

test.describe('API /api/me', () => {
  test('returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get('/api/me');
    expect(res.status()).toBe(401);
  });
});

test.describe('Auth guard API routes', () => {
  test('POST /api/import returns 401 without session', async ({ request }) => {
    const res = await request.post('/api/import', {
      data: { repo_url: 'https://github.com/ErlisK/openclaw-workspace' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Email signup flow (AgentMail)', () => {
  // Full E2E signup using a real test inbox
  // Skipped unless we can create a new inbox (inbox limit may be hit)
  test.skip(true, 'Skipped: AgentMail inbox limit reached; test Supabase email flow manually');

  test('signup sends confirmation email', async ({ page, request }) => {
    // Create an agentmail inbox
    const inbox = await request.post('https://api.agentmail.to/v0/inboxes', {
      headers: {
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: { address: `signup-test-${Date.now()}@teachrepo.com` },
    });
    expect(inbox.status()).toBe(201);
    const { address } = await inbox.json();

    // Sign up with that address
    await page.goto('/auth/signup');
    await page.fill('input[type="email"]', address);
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show "check your email" message
    await expect(page.locator('text=/check your email|almost there/i')).toBeVisible({ timeout: 8000 });

    // Poll for the confirmation email (up to 30s)
    let confirmUrl: string | null = null;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(2500);
      const msgs = await request.get(`https://api.agentmail.to/v0/inboxes/${address}/messages`, {
        headers: { Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}` },
      });
      const { messages } = await msgs.json();
      const confirm = messages?.find((m: { subject?: string }) => /confirm|verify/i.test(m.subject ?? ''));
      if (confirm) {
        // Get message body
        const detail = await request.get(`https://api.agentmail.to/v0/inboxes/${address}/messages/${confirm.id}`, {
          headers: { Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}` },
        });
        const { html_body } = await detail.json();
        const match = html_body?.match(/href="([^"]*supabase[^"]*)"/i);
        if (match) { confirmUrl = match[1]; break; }
      }
    }

    expect(confirmUrl).toBeTruthy();

    // Click the confirmation link
    await page.goto(confirmUrl!);
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });
});
