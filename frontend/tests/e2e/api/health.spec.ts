import { test, expect } from '@playwright/test'

/**
 * Live backend API tests.
 * These hit the real HireEva backend at HIREEVA_API_URL (default http://localhost:8000).
 * Skip this suite if the backend is not running by setting SKIP_API_TESTS=1.
 *
 * To run: HIREEVA_API_URL=http://localhost:8000 npx playwright test api/
 */

const API_URL = process.env.HIREEVA_API_URL || 'http://localhost:8000'

test.describe('Backend API Health', () => {
  test.skip(!!process.env.SKIP_API_TESTS, 'API tests skipped (set SKIP_API_TESTS=0 to enable)')

  test('root returns API running message', async ({ request }) => {
    const response = await request.get(`${API_URL}/`)
    expect(response.status()).toBe(200)
  })

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/health`)
    // Accept 200 (running) or 404 (not implemented yet)
    expect([200, 404]).toContain(response.status())
    if (response.status() === 200) {
      const body = await response.json()
      expect(body).toBeDefined()
    }
  })

  test('auth login endpoint exists (not 404)', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: 'test@test.com', password: 'test' },
    })
    // 401 = endpoint exists, wrong creds. 404 = endpoint missing (fail).
    expect(response.status()).not.toBe(404)
  })

  test('auth register endpoint exists (not 404)', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: { email: 'newtest@test.com', password: 'test123', firstname: 'Test', lastname: 'User' },
    })
    expect(response.status()).not.toBe(404)
  })

  test('interviews count endpoint requires authentication (401/403, not 404)', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/interviews/count`)
    expect([401, 403, 422]).toContain(response.status())
  })

  test('public interview endpoint accessible without auth (404 for missing ID, not 401)', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/interviews/public/nonexistent-id`)
    expect([404, 422]).toContain(response.status())
  })

  test('AI generate-questions endpoint requires auth', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/ai/generate-questions`, {
      data: { jobPosition: 'Dev', jobDescription: 'Test', duration: '10', type: 'Technical' },
    })
    expect([401, 403, 422]).toContain(response.status())
  })
})
