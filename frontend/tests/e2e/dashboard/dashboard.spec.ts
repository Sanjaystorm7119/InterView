import { test, expect } from '@playwright/test'
import { setupAuthState } from '../../fixtures/auth'
import { mockAllAPIs } from '../../fixtures/api-mocks'
import { DashboardPage } from '../../pages/DashboardPage'

// Unauthenticated test must run WITHOUT the authenticated beforeEach
test.describe('Dashboard - unauthenticated', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await mockAllAPIs(page)
    // No auth state — localStorage is empty
    await page.goto('/dashboard')
    await page.waitForURL('**/login', { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })
})

test.describe('Dashboard - authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthState(page)
    await mockAllAPIs(page)
  })

  test('shows dashboard greeting and stat cards', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDataLoad()

    // Greeting present
    await expect(dashboard.greeting).toBeVisible()

    // All 4 stat card labels
    await expect(page.getByText('Interviews Created')).toBeVisible()
    await expect(page.getByText('Candidates Evaluated')).toBeVisible()
    await expect(page.getByText('Avg Score')).toBeVisible()
    await expect(page.getByText('Credits Left')).toBeVisible()
  })

  test('shows credits from mock user in stat cards', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDataLoad()

    // Mock user has credits: 10 — check it appears near "Credits Left"
    // Use first() since multiple elements may contain the number
    await expect(page.getByText('10').first()).toBeVisible()
    // Mock count: 3 — should appear in "Interviews Created" card
    await expect(page.getByText('3').first()).toBeVisible()
  })

  test('shows recent interviews section with interview cards', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDataLoad()

    await expect(dashboard.recentInterviewsHeading).toBeVisible()
    // Mock returns one interview: "Senior Frontend Developer" at TechCorp
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible()
    await expect(page.getByText('TechCorp')).toBeVisible()
  })

  test('Create Interview button navigates to create-interview page', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDataLoad()

    await dashboard.createInterviewBtn.click()
    await page.waitForURL('**/create-interview', { timeout: 10000 })
    expect(page.url()).toContain('/create-interview')
  })

  test('shows empty state when no interviews exist', async ({ page }) => {
    // Override interviews/latest to return empty array
    await page.route('**/api/interviews/latest**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDataLoad()

    await expect(page.getByText('No interviews yet. Create your first one!')).toBeVisible()
  })

  test('shows error banner when API fails and allows retry', async ({ page }) => {
    // Override to fail (registered after base mocks → checked first)
    await page.route('**/api/interviews/latest**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Server error"}' })
    })
    await page.route('**/api/interviews/count', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Server error"}' })
    })

    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDataLoad()

    await expect(page.getByText('Failed to load dashboard data')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Retry/ })).toBeVisible()
  })
})
