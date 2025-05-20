/**
 * This file contains selector helpers for consistent test selection strategies.
 * Use data-testid attributes whenever possible for more stable selections.
 */

import { Page, Locator } from '@playwright/test';

export class ComponentSelectors {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Main navigation selectors
  getTokenInspectorNavLink(): Locator {
    return this.page.getByRole('link', { name: /Token Inspector/i });
  }

  getOidcExplorerNavLink(): Locator {
    return this.page.getByRole('link', { name: /OIDC Explorer/i });
  }

  getOauthPlaygroundNavLink(): Locator {
    return this.page.getByRole('link', { name: /OAuth Playground/i });
  }

  // Token Inspector selectors
  getTokenInput(): Locator {
    // Ideally, add data-testid="token-input" to the component
    return this.page.getByPlaceholder(/Paste a JWT token/i);
  }

  getTokenHeader(): Locator {
    // Ideally, add data-testid="token-header" to the component
    return this.page.getByText(/Header/i).first();
  }

  getTokenPayload(): Locator {
    // Ideally, add data-testid="token-payload" to the component
    return this.page.getByText(/Payload/i).first();
  }

  // OIDC Explorer selectors
  getOidcConfigInput(): Locator {
    // Ideally, add data-testid="oidc-config-input" to the component
    return this.page.getByPlaceholder(/Enter OpenID Connect configuration URL/i);
  }

  // OAuth Playground selectors
  getFlowSelector(): Locator {
    // Ideally, add data-testid="flow-selector" to the component
    return this.page.getByRole('combobox').first();
  }
}