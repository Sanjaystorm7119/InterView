import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly signUpLink: Locator
  readonly heading: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByPlaceholder('you@example.com')
    this.passwordInput = page.getByPlaceholder('Enter your password')
    this.submitButton = page.getByRole('button', { name: /Sign In/ })
    this.signUpLink = page.getByRole('link', { name: 'Sign Up' })
    this.heading = page.getByRole('heading', { name: 'HireEva' })
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
