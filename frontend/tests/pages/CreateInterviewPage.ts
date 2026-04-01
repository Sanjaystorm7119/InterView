import { Page, Locator } from '@playwright/test'

export class CreateInterviewPage {
  readonly page: Page
  readonly jobPositionInput: Locator
  readonly jobDescriptionTextarea: Locator
  readonly companyNameInput: Locator
  readonly durationInput: Locator
  readonly generateButton: Locator
  readonly saveButton: Locator
  readonly addQuestionButton: Locator
  readonly heading: Locator

  constructor(page: Page) {
    this.page = page
    this.jobPositionInput = page.getByPlaceholder('e.g. Senior Frontend Developer')
    this.jobDescriptionTextarea = page.getByPlaceholder('Paste the full job description...')
    this.companyNameInput = page.getByPlaceholder('Acme Corp')
    this.durationInput = page.locator('input[type="number"]')
    this.generateButton = page.getByRole('button', { name: /Generate Questions/ })
    this.saveButton = page.getByRole('button', { name: /Save & Get Link/ })
    this.addQuestionButton = page.getByRole('button', { name: '+ Add Question' })
    this.heading = page.getByRole('heading', { name: 'Create Interview' })
  }

  async goto() {
    await this.page.goto('/dashboard/create-interview')
    await this.page.waitForLoadState('networkidle')
  }

  async fillStep1(data: {
    jobPosition: string
    jobDescription: string
    companyName?: string
    duration?: string
  }) {
    await this.jobPositionInput.fill(data.jobPosition)
    await this.jobDescriptionTextarea.fill(data.jobDescription)
    if (data.companyName) await this.companyNameInput.fill(data.companyName)
    if (data.duration) {
      await this.durationInput.clear()
      await this.durationInput.fill(data.duration)
    }
  }

  stepIndicator(step: number): Locator {
    return this.page.getByText(`Step ${step} of 3`)
  }

  interviewLink(): Locator {
    return this.page.locator('input[readonly]')
  }
}
