import { test, expect } from '@playwright/test';

/**
 * E2E tests for POST /api/events
 * Tests the client-to-server analytics bridge.
 */

test.describe('POST /api/events', () => {
  test('accepts a valid event and returns 204', async ({ request }) => {
    const response = await request.post('/api/events', {
      data: {
        event_name: 'lesson_viewed',
        course_id: null,
        lesson_id: null,
        session_id: 'test-session-123',
        properties: { is_preview: true, test: true },
      },
    });

    expect(response.status()).toBe(204);
  });

  test('returns 400 for invalid event_name', async ({ request }) => {
    const response = await request.post('/api/events', {
      data: {
        event_name: 'this_is_not_a_valid_event',
        properties: {},
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 400 for malformed JSON', async ({ request }) => {
    const response = await request.post('/api/events', {
      headers: { 'Content-Type': 'application/json' },
      data: 'this is not json',
    });

    expect(response.status()).toBe(400);
  });

  test('returns 400 for invalid UUID in course_id', async ({ request }) => {
    const response = await request.post('/api/events', {
      data: {
        event_name: 'lesson_viewed',
        course_id: 'not-a-uuid',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('accepts all valid event names', async ({ request }) => {
    const validEvents = [
      'onboarding_started',
      'course_created',
      'course_published',
      'checkout_initiated',
      'checkout_completed',
      'entitlement_granted',
      'affiliate_link_clicked',
      'ai_quiz_generated',
      'sandbox_opened',
    ];

    for (const event_name of validEvents) {
      const response = await request.post('/api/events', {
        data: { event_name, properties: { test: true } },
      });

      expect(response.status(), `Expected 204 for event: ${event_name}`).toBe(204);
    }
  });

  test('accepts event with full optional fields', async ({ request }) => {
    const response = await request.post('/api/events', {
      data: {
        event_name: 'quiz_attempted',
        course_id: null,
        lesson_id: null,
        quiz_id: null,
        affiliate_id: null,
        session_id: 'test-session-abc',
        properties: {
          score_pct: 80,
          passed: true,
          attempt_number: 1,
          quiz_source: 'manual',
        },
      },
    });

    expect(response.status()).toBe(204);
  });
});

test.describe('Security: /api/events', () => {
  test('does not accept user_id in request body (server derives from session)', async ({
    request,
  }) => {
    // Even if a client tries to inject a user_id, the server ignores it
    // and derives the user from the Supabase session cookie instead.
    // We can't directly test that the stored user_id is correct from E2E,
    // but we can verify the endpoint still returns 204 (not 400) when
    // user_id is included in the body — it should be silently ignored.
    const response = await request.post('/api/events', {
      data: {
        event_name: 'lesson_viewed',
        user_id: 'evil-user-id-injection-attempt',  // Should be ignored
        properties: {},
      },
    });

    // Zod strips unknown fields — still accepts the event
    expect(response.status()).toBe(204);
  });
});
