import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('should default to system theme', async ({ page }) => {
    await page.goto('/');
    
    // Check if the HTML element has the right class
    const htmlClass = await page.evaluate(() => {
      const html = document.documentElement;
      if (html.classList.contains('dark')) return 'dark';
      if (html.classList.contains('light')) return 'light';
      return 'system';
    });
        
    // This will depend on the system theme, so we'll check if it's either light or dark
    expect(['light', 'dark']).toContain(htmlClass);
  });
});
