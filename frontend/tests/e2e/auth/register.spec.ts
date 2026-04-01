import { test, expect } from '@playwright/test'
import { mockAllAPIs, mockRegisterDuplicate } from '../../fixtures/api-mocks'

test.describe('Register', () => {
  test('shows registration form with all fields', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'HireEva' })).toBeVisible()
    await expect(page.getByText('Create your account')).toBeVisible()
    await expect(page.getByPlaceholder('John')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('Min. 6 characters')).toBeVisible()
    await expect(page.getByRole('button', { name: /Sign Up/ })).toBeVisible()
  })

  test('successful registration redirects to dashboard', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('John').fill('Jane')
    await page.getByPlaceholder('you@example.com').fill('jane@example.com')
    await page.getByPlaceholder('Min. 6 characters').fill('password123')
    await page.getByRole('button', { name: /Sign Up/ }).click()

    await page.waitForURL('**/dashboard', { timeout: 15000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('shows error when password is too short', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('John').fill('Jane')
    await page.getByPlaceholder('you@example.com').fill('jane@example.com')
    await page.getByPlaceholder('Min. 6 characters').fill('123') // Too short
    await page.getByRole('button', { name: /Sign Up/ }).click()

    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible({ timeout: 5000 })
    expect(page.url()).toContain('/register')
  })

  test('shows error for duplicate email', async ({ page }) => {
    await mockAllAPIs(page)
    // Override register to return 400 duplicate
    await mockRegisterDuplicate(page)

    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('John').fill('Jane')
    await page.getByPlaceholder('you@example.com').fill('existing@example.com')
    await page.getByPlaceholder('Min. 6 characters').fill('password123')
    await page.getByRole('button', { name: /Sign Up/ }).click()

    await expect(page.getByText('Email already registered')).toBeVisible({ timeout: 8000 })
    expect(page.url()).toContain('/register')
  })

  test('has working link to login page', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'Sign In' }).click()
    await page.waitForURL('**/login', { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })
})
