import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Token Inspector feature
 * Encapsulates UI interactions and assertions for the Token Inspector feature
 */
export class TokenInspectorPO {
  readonly page: Page;
  readonly tokenInput: Locator;
  readonly tokenHeader: Locator;
  readonly tokenPayload: Locator;
  readonly tokenSignature: Locator;
  readonly tokenJwksResolver: Locator;
  readonly tokenTimeline: Locator;
  readonly clearButton: Locator;
  readonly historyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tokenInput = page.getByTestId('token-input');
    this.tokenHeader = page.getByTestId('token-header');
    this.tokenPayload = page.getByTestId('token-payload');
    this.tokenSignature = page.getByTestId('token-signature');
    this.tokenJwksResolver = page.getByTestId('token-jwks-resolver');
    this.tokenTimeline = page.getByTestId('token-timeline');
    this.clearButton = page.getByRole('button', { name: /clear/i });
    this.historyButton = page.getByRole('button', { name: /history/i });
  }

  /**
   * Navigate to the Token Inspector page
   */
  async goto() {
    await this.page.goto('/token-inspector');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Enter a JWT token into the input field
   */
  async enterToken(token: string) {
    await this.tokenInput.clear();
    await this.tokenInput.fill(token);
    // Wait for token parsing to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear the token input
   */
  async clearToken() {
    await this.clearButton.click();
    await expect(this.tokenInput).toBeEmpty();
  }

  /**
   * Open token history
   */
  async openHistory() {
    await this.historyButton.click();
    await this.page.waitForSelector('[role="dialog"]');
  }

  /**
   * Check if token header section is visible and has content
   */
  async verifyHeaderVisible() {
    await expect(this.tokenHeader).toBeVisible();
    const headerContent = await this.tokenHeader.textContent();
    expect(headerContent).toBeTruthy();
  }

  /**
   * Check if token payload section is visible and has content
   */
  async verifyPayloadVisible() {
    await expect(this.tokenPayload).toBeVisible();
    const payloadContent = await this.tokenPayload.textContent();
    expect(payloadContent).toBeTruthy();
  }

  /**
   * Check if token signature section is visible
   */
  async verifySignatureVisible() {
    await expect(this.tokenSignature).toBeVisible();
  }

  /**
   * Check if token timeline is displayed for tokens with timing claims
   */
  async verifyTimelineVisible() {
    await expect(this.tokenTimeline).toBeVisible();
  }

  /**
   * Enter a JWKS URI to validate the token
   */
  async enterJwksUri(uri: string) {
    const jwksInput = this.tokenJwksResolver.getByRole('textbox');
    await jwksInput.fill(uri);
    await this.page.keyboard.press('Enter');
    // Wait for validation
    await this.page.waitForTimeout(1000);
  }
}