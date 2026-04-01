import { test, expect } from '@playwright/test'
import { mockAllAPIs, mockInterviewNotFound } from '../../fixtures/api-mocks'
import { MOCK_INTERVIEW_ID } from '../../fixtures/interview'
import { InterviewJoinPage } from '../../pages/InterviewJoinPage'

test.describe('Candidate Interview Flow', () => {
  test('loads public interview join page without authentication', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto(`/interview/${MOCK_INTERVIEW_ID}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Senior Frontend Developer')).toBeVisible()
    await expect(page.getByText('TechCorp')).toBeVisible()
    await expect(page.getByText('30 min interview')).toBeVisible()
  })

  test('shows pre-interview checklist items', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto(`/interview/${MOCK_INTERVIEW_ID}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Pre-Interview Checklist')).toBeVisible()
    await expect(page.getByText('Microphone')).toBeVisible()
    await expect(page.getByText('Camera (optional)')).toBeVisible()
    await expect(page.getByText('Internet Connection')).toBeVisible()
  })

  test('shows error for invalid interview ID', async ({ page }) => {
    await mockAllAPIs(page)
    // Override public interview to 404 (registered after base → checked first)
    await mockInterviewNotFound(page)

    await page.goto('/interview/nonexistent-id-xyz')
    await page.waitForLoadState('networkidle')

    // Use .first() to avoid strict mode: both the page text and toast may show "Interview not found"
    await expect(page.getByText('Interview not found').first()).toBeVisible({ timeout: 8000 })
  })

  test('validates name is required before joining', async ({ page }) => {
    await mockAllAPIs(page)
    const joinPage = new InterviewJoinPage(page)
    await joinPage.goto(MOCK_INTERVIEW_ID)

    // Click join without filling name
    await joinPage.joinButton.click()

    await expect(page.getByText('Please enter your name')).toBeVisible({ timeout: 5000 })
    expect(page.url()).toContain(`/interview/${MOCK_INTERVIEW_ID}`)
    expect(page.url()).not.toContain('/start')
  })

  test('validates microphone must be checked before joining', async ({ page }) => {
    await mockAllAPIs(page)
    const joinPage = new InterviewJoinPage(page)
    await joinPage.goto(MOCK_INTERVIEW_ID)

    // Fill name but skip mic check
    await joinPage.nameInput.fill('John Doe')
    await joinPage.joinButton.click()

    await expect(page.getByText('Please check your microphone first')).toBeVisible({
      timeout: 5000,
    })
    expect(page.url()).not.toContain('/start')
  })

  test('microphone test button shows success with fake device', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto(`/interview/${MOCK_INTERVIEW_ID}`)
    await page.waitForLoadState('networkidle')

    // First "Test" button in checklist is always Microphone
    const testMicBtn = page.getByRole('button', { name: 'Test' }).first()

    await testMicBtn.click()

    // With --use-fake-device-for-media-stream, getUserMedia resolves automatically
    await expect(page.getByText('Microphone working!')).toBeVisible({ timeout: 5000 })
    // After mic is checked, only the Camera "Test" button remains (mic row shows green check)
    await expect(page.getByRole('button', { name: 'Test' })).toHaveCount(1, { timeout: 3000 })
  })

  test('successfully joins interview and navigates to start page', async ({ page }) => {
    await mockAllAPIs(page)
    const joinPage = new InterviewJoinPage(page)
    await joinPage.goto(MOCK_INTERVIEW_ID)

    await joinPage.fillAndJoin('John Doe', 'john@example.com')

    await page.waitForURL(`**/interview/${MOCK_INTERVIEW_ID}/start`, { timeout: 10000 })
    expect(page.url()).toContain('/start')
  })

  test('start page shows interview UI with candidate name', async ({ page }) => {
    await mockAllAPIs(page)
    const joinPage = new InterviewJoinPage(page)
    await joinPage.goto(MOCK_INTERVIEW_ID)

    await joinPage.fillAndJoin('John Doe')

    await page.waitForURL(`**/interview/${MOCK_INTERVIEW_ID}/start`, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Interview')).toBeVisible()
    await expect(page.getByText('John Doe')).toBeVisible()
  })

  test('start page shows timer with interview duration', async ({ page }) => {
    await mockAllAPIs(page)
    const joinPage = new InterviewJoinPage(page)
    await joinPage.goto(MOCK_INTERVIEW_ID)

    await joinPage.fillAndJoin('Jane Smith')
    await page.waitForURL(`**/interview/${MOCK_INTERVIEW_ID}/start`, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Timer shows initial duration (30 min interview → "30:00")
    await expect(page.getByText('30:00')).toBeVisible()
  })

  test('start page redirects to join page if accessed directly without context', async ({ page }) => {
    await mockAllAPIs(page)
    // Navigate directly to /start without going through the join page (no React context)
    await page.goto(`/interview/${MOCK_INTERVIEW_ID}/start`)
    await page.waitForURL(`**/interview/${MOCK_INTERVIEW_ID}`, { timeout: 10000 })
    expect(page.url()).not.toContain('/start')
    expect(page.url()).toContain(`/interview/${MOCK_INTERVIEW_ID}`)
  })

  test('completed page shows success message', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto(`/interview/${MOCK_INTERVIEW_ID}/completed`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Interview Complete!')).toBeVisible()
    await expect(page.getByText('Thank you for taking the time')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible()
  })
})
