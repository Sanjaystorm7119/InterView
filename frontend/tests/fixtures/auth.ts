import { Page } from '@playwright/test'

export const MOCK_USER = {
  id: 'user-test-uuid-1234',
  email: 'test@example.com',
  firstname: 'Test',
  lastname: 'User',
  name: 'Test User',
  credits: 10,
  picture: null,
}

export const MOCK_TOKENS = {
  access_token: 'mock-access-token-xyz-123',
  refresh_token: 'mock-refresh-token-xyz-456',
}

export const MOCK_AUTH_RESPONSE = {
  ...MOCK_TOKENS,
  token_type: 'bearer',
  user: MOCK_USER,
}

/** Set auth localStorage BEFORE page scripts run, so the auth context picks it up. */
export async function setupAuthState(page: Page) {
  await page.addInitScript((data) => {
    window.localStorage.setItem('access_token', data.access_token)
    window.localStorage.setItem('refresh_token', data.refresh_token)
    window.localStorage.setItem('user', JSON.stringify(data.user))
  }, { ...MOCK_TOKENS, user: MOCK_USER })
}
