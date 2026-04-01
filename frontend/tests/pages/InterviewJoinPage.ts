import { Page, Locator } from '@playwright/test'

export class InterviewJoinPage {
  readonly page: Page
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly joinButton: Locator
  readonly testMicButton: Locator

  constructor(page: Page) {
    this.page = page
    this.nameInput = page.getByPlaceholder('Full name')
    this.emailInput = page.getByPlaceholder('you@email.com')
    this.joinButton = page.getByRole('button', { name: 'Join Interview' })
    // First "Test" button in the checklist is always Microphone (Camera is second)
    this.testMicButton = page.getByRole('button', { name: 'Test' }).first()
  }

  async goto(interviewId: string) {
    await this.page.goto(`/interview/${interviewId}`)
    await this.page.waitForLoadState('networkidle')
  }

  async fillAndJoin(name: string, email?: string) {
    await this.nameInput.fill(name)
    if (email) await this.emailInput.fill(email)

    // Check mic — wait for the success toast to confirm getUserMedia resolved
    await this.testMicButton.click()
    await this.page.getByText('Microphone working!').waitFor({ state: 'visible', timeout: 5000 })

    await this.joinButton.click()
  }
}
