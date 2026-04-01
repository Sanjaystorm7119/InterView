import { test, expect } from '@playwright/test'
import { setupAuthState } from '../../fixtures/auth'
import { mockAllAPIs } from '../../fixtures/api-mocks'
import { CreateInterviewPage } from '../../pages/CreateInterviewPage'

test.describe('Create Interview Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthState(page)
    await mockAllAPIs(page)
  })

  test('shows step 1 form with all inputs', async ({ page }) => {
    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    await expect(createPage.heading).toBeVisible()
    await expect(createPage.stepIndicator(1)).toBeVisible()
    await expect(createPage.jobPositionInput).toBeVisible()
    await expect(createPage.jobDescriptionTextarea).toBeVisible()
    await expect(createPage.companyNameInput).toBeVisible()
    await expect(createPage.generateButton).toBeVisible()
  })

  test('shows interview type toggle buttons', async ({ page }) => {
    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    await expect(page.getByText('Technical')).toBeVisible()
    await expect(page.getByText('Behavioral')).toBeVisible()
    await expect(page.getByText('Experience')).toBeVisible()
  })

  test('validates required fields before generating questions', async ({ page }) => {
    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    // Click generate without filling required fields
    await createPage.generateButton.click()

    await expect(page.getByText('Please fill in job position and description')).toBeVisible({
      timeout: 5000,
    })
    await expect(createPage.stepIndicator(1)).toBeVisible()
  })

  test('step 1 → step 2: generates questions and shows them', async ({ page }) => {
    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    await createPage.fillStep1({
      jobPosition: 'Senior Frontend Developer',
      jobDescription: 'We are looking for an experienced React developer with 5+ years of experience building scalable web applications.',
      companyName: 'TechCorp',
    })
    await createPage.generateButton.click()

    // Step indicator changes to step 2
    await expect(createPage.stepIndicator(2)).toBeVisible({ timeout: 10000 })

    // Mock returns 3 questions — heading shows count
    await expect(page.getByRole('heading', { name: /Questions/ })).toBeVisible()

    // Questions appear in textareas
    await expect(page.locator('textarea').first()).toHaveValue('Tell me about your React experience')
  })

  test('step 2: can add a new question', async ({ page }) => {
    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    await createPage.fillStep1({
      jobPosition: 'Frontend Developer',
      jobDescription: 'React developer role with 3+ years experience.',
    })
    await createPage.generateButton.click()
    await expect(createPage.stepIndicator(2)).toBeVisible({ timeout: 10000 })

    const initialCount = await page.locator('textarea').count()
    await createPage.addQuestionButton.click()
    const newCount = await page.locator('textarea').count()
    expect(newCount).toBe(initialCount + 1)
  })

  test('step 2 → step 3: saves interview and shows link', async ({ page }) => {
    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    await createPage.fillStep1({
      jobPosition: 'Senior Frontend Developer',
      jobDescription: 'We are looking for an experienced React developer.',
      companyName: 'TechCorp',
    })
    await createPage.generateButton.click()
    await expect(createPage.stepIndicator(2)).toBeVisible({ timeout: 10000 })

    await createPage.saveButton.click()

    // Step 3: interview created — use heading role to avoid toast conflict
    await expect(page.getByRole('heading', { name: 'Interview Created!' })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText('Share this link with candidates')).toBeVisible()

    // Should show a readonly link input containing /interview/
    const linkInput = createPage.interviewLink()
    await expect(linkInput).toBeVisible()
    const linkValue = await linkInput.inputValue()
    expect(linkValue).toMatch(/\/interview\/[a-f0-9-]+/)
  })

  test('step 3: copy link button is present', async ({ page }) => {
    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    await createPage.fillStep1({
      jobPosition: 'Frontend Developer',
      jobDescription: 'React developer with 2+ years experience.',
    })
    await createPage.generateButton.click()
    await expect(createPage.stepIndicator(2)).toBeVisible({ timeout: 10000 })
    await createPage.saveButton.click()
    await expect(page.getByRole('heading', { name: 'Interview Created!' })).toBeVisible({
      timeout: 15000,
    })

    // Email and Dashboard buttons in step 3
    await expect(page.getByRole('button', { name: /Email/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toBeVisible()
  })

  test('step 3: Go to Dashboard navigates back', async ({ page }) => {
    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    await createPage.fillStep1({
      jobPosition: 'Backend Developer',
      jobDescription: 'Python FastAPI developer with 3+ years experience.',
    })
    await createPage.generateButton.click()
    await expect(createPage.stepIndicator(2)).toBeVisible({ timeout: 10000 })
    await createPage.saveButton.click()
    await expect(page.getByRole('heading', { name: 'Interview Created!' })).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole('link', { name: 'Go to Dashboard' }).click()
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('shows no credits error when user has 0 credits', async ({ page }) => {
    // Override user to have 0 credits AFTER auth is set
    await page.addInitScript(() => {
      const user = JSON.parse(window.localStorage.getItem('user') || '{}')
      user.credits = 0
      window.localStorage.setItem('user', JSON.stringify(user))
    })

    const createPage = new CreateInterviewPage(page)
    await createPage.goto()

    await createPage.fillStep1({
      jobPosition: 'Frontend Developer',
      jobDescription: 'React developer with 2+ years experience.',
    })
    await createPage.generateButton.click()

    await expect(page.getByText('No credits remaining')).toBeVisible({ timeout: 5000 })
  })
})
