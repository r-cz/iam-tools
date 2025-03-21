import { Page } from '@playwright/test';

/**
 * Sets the theme to a specific value
 */
export async function setTheme(page: Page, theme: 'light' | 'dark' | 'system'): Promise<void> {
  // Click on theme toggle button to open dropdown
  await page.click('button:has-text("Toggle theme")');
  
  // Click on the specified theme option
  await page.click(`text=${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
}

/**
 * Gets the current theme
 */
export async function getCurrentTheme(page: Page): Promise<'light' | 'dark' | 'system'> {
  return page.evaluate(() => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) return 'dark';
    if (html.classList.contains('light')) return 'light';
    return 'system';
  });
}

/**
 * Loads an example token in the token inspector
 */
export async function loadExampleToken(page: Page): Promise<string> {
  // Go to token inspector if not already there
  if (!page.url().includes('token-inspector')) {
    await page.goto('/token-inspector');
  }
  
  // Click on example button to load a token
  await page.click('button:has-text("Example")');
  
  // Get the token value
  const tokenValue = await page.inputValue('textarea#token-input');
  return tokenValue;
}

/**
 * Decodes a token in the token inspector
 */
export async function decodeToken(page: Page): Promise<void> {
  await page.click('button:has-text("Inspect Token")');
  
  // Wait for the decoded content to appear
  await page.waitForSelector('button[role="tab"]:has-text("Payload")');
}
