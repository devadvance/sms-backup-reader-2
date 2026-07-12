import { test, expect } from '@playwright/test';
import { SMSBackupReaderPage } from '../helpers/app.pom';

test.describe('Visual Regression Tests', () => {
  test('Capture all 6 key views', async ({ page }) => {
    const appPage = new SMSBackupReaderPage(page);

    // 1. Initial State (Empty)
    await appPage.goto();
    await page.addStyleTag({
      content: `* { transition: none !important; transition-duration: 0s !important; animation: none !important; }`
    });
    await expect(page).toHaveScreenshot('initial-state.png', {
      maxDiffPixelRatio: 0.03
    });

    // 2. Loaded Thread List
    await appPage.uploadFile('sample_small.xml');
    await expect(appPage.threadListItems).toHaveCount(2);

    // Check if mobile viewport to toggle sidebar
    const viewport = page.viewportSize();
    const isMobile = viewport ? viewport.width < 768 : false;
    if (isMobile) {
      const toggle = page.locator('[data-testid="sidebar-toggle"]');
      if (await toggle.isVisible()) {
        await toggle.click();
        await page.waitForTimeout(400);
      }
    }

    await expect(page).toHaveScreenshot('loaded-thread-list.png', {
      maxDiffPixelRatio: 0.03
    });

    // 3. Active Thread (Contact A selected)
    await appPage.clickThread(0);
    await expect(appPage.messageListItems).toHaveCount(4);

    const messageMasks = [
      page.locator('[data-testid="message-item"] .text-\\[10px\\]'),
      page.locator('[data-testid="message-item"] div.text-stone-400')
    ];

    await expect(page).toHaveScreenshot('active-thread.png', {
      maxDiffPixelRatio: 0.03,
      mask: messageMasks
    });

    // 5. Dark Mode Active Thread
    await appPage.toggleTheme();
    await expect(page).toHaveScreenshot('dark-mode-active-thread.png', {
      maxDiffPixelRatio: 0.03,
      mask: messageMasks
    });

    // 6. Spanish Language View
    await appPage.toggleTheme(); // toggles back to light mode
    await appPage.changeLanguage('es');
    await expect(appPage.page.locator('header p')).toContainText('4 mensajes');
    await expect(page).toHaveScreenshot('spanish-language-view.png', {
      maxDiffPixelRatio: 0.03,
      mask: messageMasks
    });

    // 4. Media View (Contact C selected from sample_mms.xml)
    await appPage.changeLanguage('en');
    await appPage.uploadFile('sample_mms.xml');
    await expect(appPage.threadListItems).toHaveCount(1);
    await appPage.clickThread(0); // Contact C
    await expect(appPage.messageListItems).toHaveCount(4);

    // Ensure media components are present
    await expect(appPage.messageListItems.nth(0).locator('img')).toBeVisible();
    await expect(appPage.messageListItems.nth(1).locator('video')).toBeVisible();
    await expect(appPage.messageListItems.nth(2).locator('audio')).toBeVisible();
    await expect(appPage.messageListItems.nth(3).locator('button:has-text("document.pdf")')).toBeVisible();

    const mmsMasks = [
      page.locator('[data-testid="message-item"] .text-\\[10px\\]'),
      page.locator('[data-testid="message-item"] div.text-stone-400')
    ];

    await expect(page).toHaveScreenshot('media-view.png', {
      maxDiffPixelRatio: 0.03,
      mask: mmsMasks
    });
  });
});
