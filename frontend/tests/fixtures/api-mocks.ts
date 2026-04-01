import { Page } from '@playwright/test'
import { MOCK_AUTH_RESPONSE, MOCK_USER } from './auth'
import {
  MOCK_INTERVIEW,
  MOCK_INTERVIEW_ID,
  MOCK_QUESTIONS_RESPONSE,
  MOCK_FEEDBACK_LIST,
  MOCK_FEEDBACK_AI_RESPONSE,
} from './interview'

/**
 * Single catch-all route handler for all backend API calls.
 * Intercepts http://localhost:8000/api/** requests.
 *
 * Register test-specific overrides AFTER calling this function —
 * Playwright checks handlers in LIFO order, so later-registered handlers take precedence.
 */
export async function mockAllAPIs(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    const fulfill = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })

    // ── Auth ─────────────────────────────────────────────────────────────
    if (url.includes('/api/auth/login') && method === 'POST') {
      return fulfill(MOCK_AUTH_RESPONSE)
    }
    if (url.includes('/api/auth/register') && method === 'POST') {
      return fulfill(MOCK_AUTH_RESPONSE)
    }
    if (url.includes('/api/auth/logout')) {
      return fulfill({})
    }
    if (url.includes('/api/auth/refresh')) {
      return fulfill(MOCK_AUTH_RESPONSE)
    }
    if (url.includes('/api/users/me')) {
      return fulfill(MOCK_USER)
    }

    // ── Interviews ────────────────────────────────────────────────────────
    if (url.includes('/api/interviews/count')) {
      return fulfill({ count: 3 })
    }
    if (url.includes('/api/interviews/latest')) {
      return fulfill([MOCK_INTERVIEW])
    }
    if (url.includes('/api/interviews/public/')) {
      return fulfill(MOCK_INTERVIEW)
    }
    if (url.includes('/feedback') && method === 'POST') {
      return fulfill({ id: 1, ...MOCK_FEEDBACK_LIST[0] })
    }
    if (url.includes('/feedback')) {
      return fulfill(MOCK_FEEDBACK_LIST)
    }
    if (url.includes(`/api/interviews/${MOCK_INTERVIEW_ID}`) && method === 'GET') {
      return fulfill(MOCK_INTERVIEW)
    }
    if (url.includes('/api/interviews/') && method === 'POST') {
      return fulfill({ ...MOCK_INTERVIEW, id: 2 })
    }
    if (url.includes('/api/interviews/') && method === 'GET') {
      return fulfill(MOCK_INTERVIEW)
    }

    // ── AI ────────────────────────────────────────────────────────────────
    if (url.includes('/api/ai/generate-questions')) {
      return fulfill(MOCK_QUESTIONS_RESPONSE)
    }
    if (url.includes('/api/ai/company-summary')) {
      return fulfill({ summary: 'TechCorp is an innovative technology company.' })
    }
    if (url.includes('/api/ai/generate-feedback')) {
      return fulfill(MOCK_FEEDBACK_AI_RESPONSE)
    }
    if (url.includes('/api/ai/')) {
      return fulfill({ content: '{}' })
    }

    // ── Misc ──────────────────────────────────────────────────────────────
    if (url.includes('/api/job-descriptions/')) {
      return fulfill({ id: 1 })
    }
    if (url.includes('/api/health')) {
      return fulfill({ status: 'ok' })
    }

    // Default: pass through (e.g. Next.js internal requests)
    return route.continue()
  })
}

/** Override login to return 401 for invalid credentials tests. */
export async function mockLoginFailure(page: Page, detail = 'Invalid email or password') {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail }),
    })
  })
}

/** Override register to return 400 for duplicate email tests. */
export async function mockRegisterDuplicate(page: Page) {
  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Email already registered' }),
    })
  })
}

/** Override public interview endpoint to return 404. */
export async function mockInterviewNotFound(page: Page) {
  await page.route('**/api/interviews/public/**', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Interview not found' }),
    })
  })
}
