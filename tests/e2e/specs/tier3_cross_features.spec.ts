import { test, expect, Page } from '@playwright/test';
import { SMSBackupReaderPage } from '../helpers/app.pom';
import fs from 'fs';

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

test.describe('Tier 3: Cross Features', () => {
  let appPage: SMSBackupReaderPage;

  test.beforeEach(async ({ page }) => {
    appPage = new SMSBackupReaderPage(page);
    await appPage.goto();
    await page.addStyleTag({
      content: `* { transition: none !important; transition-duration: 0s !important; animation: none !important; }`
    });
  });

  // 1. Theme/Language interactions before upload and search
  test('1. UI state prep before upload and search: theme, language, and search filter consistency', async () => {
    // Switch theme to dark, switch language to Spanish, then upload file (test 1)
    await ensureSidebarClosed(appPage.page);
    await appPage.toggleTheme();
    await appPage.changeLanguage('es');
    await appPage.uploadFile('sample_small.xml');
    await expect(appPage.threadListItems).toHaveCount(2);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact A');

    // Reset language and theme
    await ensureSidebarClosed(appPage.page);
    await appPage.changeLanguage('en');
    await appPage.toggleTheme();

    // Upload file, search thread, toggle theme, verify filtered thread remains (test 2)
    await ensureSidebarOpen(appPage.page);
    await appPage.searchThreads('Contact B');
    await ensureSidebarClosed(appPage.page);
    await appPage.toggleTheme();
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact B');

    // Upload file, search thread, switch language, verify placeholder and results (test 3)
    await ensureSidebarClosed(appPage.page);
    await appPage.changeLanguage('es');
    await ensureSidebarOpen(appPage.page);
    await expect(appPage.threadSearchInput).toHaveAttribute('placeholder', 'Buscar conversaciones...');
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact B');
  });

  // 2. Active thread operations: theme/language toggles, CSV/TXT exports and verification
  test('2. Active thread operations: full interaction path and export consistency', async () => {
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);

    // Select Contact A (test 4)
    await appPage.clickThread(0);
    await ensureSidebarClosed(appPage.page);
    await appPage.toggleTheme();
    await appPage.changeLanguage('es');

    await expect(appPage.page.locator('header h1')).toHaveText('Contact A');
    await expect(appPage.page.locator('header p')).toContainText('4 mensajes');

    const csvPath1 = await appPage.triggerExportCsv();
    const txtPath = await appPage.triggerExportText();
    expect(csvPath1).not.toBe('');
    expect(txtPath).not.toBe('');
    expect(fs.readFileSync(csvPath1, 'utf8')).toContain('SMS 1 in Thread 1');
    expect(fs.readFileSync(txtPath, 'utf8')).toContain('SMS 1 in Thread 1');

    // Export again after theme toggle and compare (test 5)
    await ensureSidebarClosed(appPage.page);
    await appPage.toggleTheme(); // back to light
    const csvPath2 = await appPage.triggerExportCsv();
    expect(csvPath2).not.toBe('');
    expect(fs.readFileSync(csvPath1, 'utf8')).toEqual(fs.readFileSync(csvPath2, 'utf8'));
  });

  // 3. Selection persistence, dark mode search in Spanish, and archive clearing
  test('3. State Persistence and resets: clearing archive, select prompt translations, and thread selection persistence', async () => {
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);
    await appPage.clickThread(0); // Contact A

    // Thread selection persistence when switching language back and forth (test 8)
    await ensureSidebarClosed(appPage.page);
    await appPage.changeLanguage('es');
    await expect(appPage.page.locator('header h1')).toHaveText('Contact A');
    await appPage.changeLanguage('en');
    await expect(appPage.page.locator('header h1')).toHaveText('Contact A');

    // Search in Spanish dark mode returns correct items (test 7)
    await appPage.changeLanguage('es');
    await appPage.toggleTheme();
    await ensureSidebarOpen(appPage.page);
    await appPage.searchThreads('Contact A');
    await expect(appPage.threadListItems).toHaveCount(1);
    await appPage.clickThread(0);
    await expect(appPage.messageListItems).toHaveCount(4);

    // Upload, select thread, clear data, switch language, verify select prompt translates (test 6)
    await ensureSidebarOpen(appPage.page);
    await appPage.page.locator('button', { hasText: 'Borrar Archivo Cargado' }).click({ force: true });
    await expect(appPage.threadListItems).toHaveCount(0);
    await ensureSidebarClosed(appPage.page);
    await expect(appPage.page.locator('header p')).toContainText('Selecciona una conversación para comenzar a leer');
  });

  // 4. Media playback in dark theme and rapid configuration toggling before load
  test('4. Advanced Media and configuration: playback UI in dark mode and rapid toggles persistence', async () => {
    // MMS media elements playback checks in dark theme (test 9)
    await appPage.uploadFile('sample_mms.xml');
    await ensureSidebarOpen(appPage.page);
    await appPage.clickThread(0);
    await ensureSidebarClosed(appPage.page);
    await appPage.toggleTheme();

    const img = appPage.messageListItems.nth(0).locator('img');
    await expect(img).toBeVisible();

    const video = appPage.messageListItems.nth(1).locator('video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('controls', '');
    expect(await video.getAttribute('autoplay')).toBeNull();

    // Toggle language and theme 5 times, then upload and click thread (test 10)
    for (let i = 0; i < 5; i++) {
      await ensureSidebarClosed(appPage.page);
      await appPage.toggleTheme();
      await appPage.changeLanguage(i % 2 === 0 ? 'es' : 'en');
    }
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);
    await appPage.clickThread(1);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact B');
  });
});
