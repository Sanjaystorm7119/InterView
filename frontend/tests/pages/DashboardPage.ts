import { Page, Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly createInterviewBtn: Locator
  readonly recentInterviewsHeading: Locator
  readonly greeting: Locator

  constructor(page: Page) {
    this.page = page
    // Button/link in the Recent Interviews section header
    this.createInterviewBtn = page.getByRole('link', { name: /Create Interview/ }).first()
    this.recentInterviewsHeading = page.getByText('Recent Interviews')
    this.greeting = page.locator('h1').filter({ hasText: /Good/ })
  }

  async goto() {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForDataLoad() {
    // Skeletons have animate-pulse class; wait for them to disappear
    await this.page
      .locator('.animate-pulse')
      .first()
      .waitFor({ state: 'detached', timeout: 10000 })
      .catch(() => {
        // No skeletons visible — data already loaded or error state
      })
  }

  statCard(label: string): Locator {
    return this.page.locator(`text=${label}`).locator('..').locator('..')
  }
}
