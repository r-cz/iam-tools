import { Page } from '@playwright/test';

export class Navigation {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goToHome() {
    await this.page.goto('/');
  }

  async goToTokenInspector() {
    await this.page.goto('/token-inspector');
  }

  async goToOidcExplorer() {
    await this.page.goto('/oidc-explorer');
  }

  async goToOauthPlayground() {
    await this.page.goto('/oauth-playground');
  }

  async toggleTheme() {
    await this.page.getByRole('button', { name: /toggle theme/i }).click();
  }
}