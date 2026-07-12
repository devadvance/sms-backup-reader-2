import { test, expect, Page } from '@playwright/test';
import { SMSBackupReaderPage } from '../helpers/app.pom';

async function ensureSidebarOpen(page: Page) {
  await page.waitForTimeout(500);
  const toggle = page.locator('[data-testid="sidebar-toggle"]');
  const backBtn = page.locator('[data-testid="mobile-back-button"]');
  if (await toggle.isVisible()) {
    await toggle.click({ force: true });
    await page.waitForTimeout(400);
  } else if (await backBtn.isVisible()) {
    await backBtn.click({ force: true });
    await page.waitForTimeout(400);
  }
}

async function ensureSidebarClosed(page: Page) {
  const backdrop = page.locator('[data-testid="sidebar-backdrop"]');
  if (await backdrop.isVisible()) {
    try {
      await backdrop.click({ position: { x: 350, y: 50 }, timeout: 2000 });
      await expect(backdrop).not.toBeVisible();
      await page.waitForTimeout(400);
    } catch {
      // Ignore if unmounting or already closed
    }
  }
}

test.describe('Tier 2: Boundary Cases', () => {
  let appPage: SMSBackupReaderPage;

  test.beforeEach(async ({ page }) => {
    appPage = new SMSBackupReaderPage(page);
    await appPage.goto();
    await page.addStyleTag({
      content: `* { transition: none !important; transition-duration: 0s !important; animation: none !important; }`
    });
  });

  // 1. Non-selected State
  test('1. Non-selected State: export buttons are hidden initially in both languages', async () => {
    await ensureSidebarClosed(appPage.page);

    await expect(appPage.exportCsvBtn).not.toBeVisible();
    await expect(appPage.exportTextBtn).not.toBeVisible();

    await appPage.changeLanguage('es');
    await expect(appPage.exportCsvBtn).not.toBeVisible();
    await expect(appPage.exportTextBtn).not.toBeVisible();
  });

  // 2. Consecutively toggled themes
  test('2. Rapid Theme Toggles: toggling theme consecutively up to 10 times behaves correctly', async () => {
    await ensureSidebarClosed(appPage.page);

    const root = appPage.page.locator('html');
    for (let i = 1; i <= 10; i++) {
      await appPage.toggleTheme();
      if (i % 2 === 1) {
        await expect(root).toHaveClass(/dark/);
      } else {
        await expect(root).not.toHaveClass(/dark/);
      }
    }
  });

  // 3. Consecutively toggled languages
  test('3. Rapid Language Toggles: toggling language consecutively up to 10 times behaves correctly', async () => {
    await ensureSidebarClosed(appPage.page);

    for (let i = 1; i <= 10; i++) {
      const targetLang = i % 2 === 1 ? 'es' : 'en';
      await appPage.changeLanguage(targetLang);
      await expect(appPage.page.locator('h1')).toHaveText('SMS Backup Reader');
    }
  });

  // 4. Empty XML Archive
  test('4. Empty XML Archive: uploading empty backup behaves correctly', async () => {
    await appPage.uploadFile('empty.xml');
    await expect(appPage.loadingProgressBar).not.toBeVisible();
    await expect(appPage.threadListItems).toHaveCount(0);
    await expect(appPage.page.locator('text=No conversations found')).toBeVisible();
    await expect(appPage.threadSearchInput).toHaveValue('');

    await ensureSidebarOpen(appPage.page);
    await appPage.searchThreads('anything');
    await expect(appPage.threadListItems).toHaveCount(0);
  });

  // 5. Regex/Special Character Searches
  test('5. Regex/Special Character Searches: searching with special characters does not crash and yields 0 threads', async () => {
    await appPage.uploadFile('empty.xml');
    await ensureSidebarOpen(appPage.page);

    const specialChars = ['*', '?', '[', ']', '\\', '.*', '+'];
    for (const char of specialChars) {
      await appPage.searchThreads(char);
      await expect(appPage.threadListItems).toHaveCount(0);
    }
  });

  // 6. Corrupt Attachments
  test('6. Corrupt Attachments: handling of corrupt base64 data and unsupported files', async () => {
    await appPage.uploadFile('corrupt_attachments.xml');
    await expect(appPage.loadingProgressBar).not.toBeVisible();
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact D');

    await ensureSidebarOpen(appPage.page);
    await appPage.clickThread(0);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact D');
    await expect(appPage.page.locator('header p')).toContainText('2 messages');
    await expect(appPage.messageListItems).toHaveCount(2);

    // Corrupt base64 image displays img
    const img = appPage.messageListItems.nth(0).locator('img');
    await expect(img).toBeAttached();

    // Unsupported type download button
    const downloadBtn = appPage.messageListItems.nth(1).locator('button');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toContainText('corrupt.file');
  });

  // 7. Consecutive and Redundant Uploads
  test('7. Consecutive and Redundant Uploads: rapid uploading of different/same files and clearing', async () => {
    // Clear button hidden initially
    const clearBtn = appPage.page.locator('button', { hasText: 'Clear Loaded Archive' });
    await expect(clearBtn).not.toBeVisible();

    // Upload corrupt then small
    await appPage.uploadFile('corrupt_attachments.xml');
    await expect(appPage.loadingProgressBar).not.toBeVisible();
    await expect(appPage.threadListItems).toHaveCount(1);

    await appPage.uploadFile('sample_small.xml');
    await expect(appPage.loadingProgressBar).not.toBeVisible();
    await expect(appPage.threadListItems).toHaveCount(2);

    // Upload empty after small clears threads
    await appPage.uploadFile('empty.xml');
    await expect(appPage.loadingProgressBar).not.toBeVisible();
    await expect(appPage.threadListItems).toHaveCount(0);

    // Consecutive double upload of same file works
    await appPage.uploadFile('sample_small.xml');
    await expect(appPage.loadingProgressBar).not.toBeVisible();
    await expect(appPage.threadListItems).toHaveCount(2);

    await appPage.uploadFile('sample_small.xml');
    await expect(appPage.loadingProgressBar).not.toBeVisible();
    await expect(appPage.threadListItems).toHaveCount(2);
  });
});
