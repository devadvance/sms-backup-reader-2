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

test.describe('Tier 1: Feature Coverage', () => {
  let appPage: SMSBackupReaderPage;

  test.beforeEach(async ({ page }) => {
    appPage = new SMSBackupReaderPage(page);
    await appPage.goto();
    await page.addStyleTag({
      content: `* { transition: none !important; transition-duration: 0s !important; animation: none !important; }`
    });
  });

  // 1. Initial Layout
  test('1. Initial Layout: title, subtitle, prompt, upload, and search elements are visible', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('SMS Backup Reader');
    await expect(appPage.page.locator('header p')).toContainText('Select a conversation to begin reading');
    const input = appPage.fileInput;
    await expect(input).toBeAttached();
    await expect(input).not.toBeVisible();
    const uploadBtn = appPage.page.locator('button', { hasText: 'Upload SMS Backup XML' });
    await expect(uploadBtn).toBeVisible();
    await expect(appPage.threadSearchInput).toBeVisible();
    await expect(appPage.threadSearchInput).toHaveAttribute('placeholder', 'Search conversations...');
  });

  // 2. Theme and Language Switcher
  test('2. Theme and Language Switcher: toggles theme and translates elements', async () => {
    // Ensure sidebar is closed on mobile so header is clickable
    await ensureSidebarClosed(appPage.page);

    // Theme toggling
    const root = appPage.page.locator('html');
    await expect(root).not.toHaveClass(/dark/);
    await appPage.toggleTheme();
    await expect(root).toHaveClass(/dark/);
    await appPage.toggleTheme();
    await expect(root).not.toHaveClass(/dark/);

    // Language switcher
    // English
    await appPage.changeLanguage('en');
    await expect(appPage.page.locator('aside h2')).toHaveText('SMS Backup Reader');
    await expect(appPage.page.locator('header h1')).toHaveText('SMS Backup Reader');

    // Spanish
    await appPage.changeLanguage('es');
    await expect(appPage.page.locator('aside h2')).toHaveText('SMS Backup Reader');
    await expect(appPage.page.locator('header h1')).toHaveText('SMS Backup Reader');

    // French
    await appPage.changeLanguage('fr');
    await expect(appPage.page.locator('aside h2')).toHaveText('SMS Backup Reader');
    await expect(appPage.page.locator('header h1')).toHaveText('SMS Backup Reader');

    // Hindi
    await appPage.changeLanguage('hi');
    await expect(appPage.page.locator('aside h2')).toHaveText('SMS Backup Reader');
    await expect(appPage.page.locator('header h1')).toHaveText('SMS Backup Reader');

    // Telugu
    await appPage.changeLanguage('te');
    await expect(appPage.page.locator('aside h2')).toHaveText('SMS Backup Reader');
    await expect(appPage.page.locator('header h1')).toHaveText('SMS Backup Reader');

    // Restore to English
    await appPage.changeLanguage('en');
  });

  // 3. Upload and Parsing
  test('3. Upload and Parsing: progress state and initial thread count', async () => {
    await appPage.uploadFile('sample_small.xml');
    await expect(appPage.loadingProgressBar).not.toBeVisible();
    await expect(appPage.threadListItems).toHaveCount(2);
    await expect(appPage.threadListItems.nth(0).locator('.font-semibold')).toHaveText('Contact A');
    await expect(appPage.threadListItems.nth(1).locator('.font-semibold')).toHaveText('Contact B');
  });

  // 4. Thread Filtering/Search
  test('4. Thread Filtering: search by contact name or phone number is case-insensitive', async () => {
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);

    // Search Contact A
    await appPage.searchThreads('Contact A');
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact A');

    // Search Contact B
    await appPage.searchThreads('Contact B');
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact B');

    // Search common substring
    await appPage.searchThreads('Contact');
    await expect(appPage.threadListItems).toHaveCount(2);

    // Case-insensitivity
    await appPage.searchThreads('contact a');
    await expect(appPage.threadListItems).toHaveCount(1);

    // Nonexistent search
    await appPage.searchThreads('XYZNonexistent');
    await expect(appPage.threadListItems).toHaveCount(0);
    await expect(appPage.page.locator('text=No conversations found')).toBeVisible();

    // Search by phone number A
    await appPage.searchThreads('5550000001');
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact A');

    // Search by phone number B
    await appPage.searchThreads('5550000002');
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact B');
  });

  // 5. Thread selection and details (Contact A and Contact B)
  test('5. Thread details: selection displays messages, counts, and contents for Contact A and Contact B', async () => {
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);

    // Click Thread A
    await appPage.clickThread(0);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact A');
    await expect(appPage.page.locator('header p')).toContainText('4 messages');
    await expect(appPage.messageListItems).toHaveCount(4);
    await expect(appPage.messageListItems.nth(0)).toContainText('SMS 1 in Thread 1');
    await expect(appPage.messageListItems.nth(1)).toContainText('SMS 2 in Thread 1');
    await expect(appPage.messageListItems.nth(2)).toContainText('SMS 3 in Thread 1');
    await expect(appPage.messageListItems.nth(3)).toContainText('MMS 1 text in Thread 1');

    // For mobile: open sidebar before clicking the next thread
    await ensureSidebarOpen(appPage.page);

    // Click Thread B
    await appPage.clickThread(1);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact B');
    await expect(appPage.page.locator('header p')).toContainText('3 messages');
    await expect(appPage.messageListItems).toHaveCount(3);
    await expect(appPage.messageListItems.nth(0)).toContainText('SMS 4 in Thread 2');
    await expect(appPage.messageListItems.nth(1)).toContainText('SMS 5 in Thread 2');
    await expect(appPage.messageListItems.nth(2)).toContainText('MMS 2 text in Thread 2');
  });

  // 6. Interactivity with active conversation
  test('6. Active Conversation Interactivity: toggles language and theme on active threads', async () => {
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);
    await appPage.clickThread(0);
    await expect(appPage.messageListItems).toHaveCount(4);

    // Sidebar automatically closes on mobile. Header buttons are clickable.
    await appPage.changeLanguage('es');
    await expect(appPage.page.locator('header p')).toContainText('4 mensajes');

    await appPage.toggleTheme();
    await expect(appPage.page.locator('html')).toHaveClass(/dark/);
    await expect(appPage.messageListItems).toHaveCount(4);
  });

  // 7. File Exports
  test('7. File Exports: active threads can be exported as CSV and TXT files', async () => {
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);

    // Export Thread A
    await appPage.clickThread(0);
    await ensureSidebarClosed(appPage.page);
    const csvPathA = await appPage.triggerExportCsv();
    const txtPathA = await appPage.triggerExportText();
    expect(csvPathA).not.toBe('');
    expect(txtPathA).not.toBe('');
    expect(fs.readFileSync(csvPathA, 'utf8')).toContain('SMS 1 in Thread 1');
    expect(fs.readFileSync(csvPathA, 'utf8')).toContain('Contact A');
    expect(fs.readFileSync(txtPathA, 'utf8')).toContain('SMS 1 in Thread 1');
    expect(fs.readFileSync(txtPathA, 'utf8')).toContain('Contact A');

    // For mobile: open sidebar before clicking next thread
    await ensureSidebarOpen(appPage.page);

    // Export Thread B
    await appPage.clickThread(1);
    await ensureSidebarClosed(appPage.page);
    const csvPathB = await appPage.triggerExportCsv();
    const txtPathB = await appPage.triggerExportText();
    expect(csvPathB).not.toBe('');
    expect(txtPathB).not.toBe('');
    expect(fs.readFileSync(csvPathB, 'utf8')).toContain('SMS 4 in Thread 2');
    expect(fs.readFileSync(csvPathB, 'utf8')).toContain('Contact B');
    expect(fs.readFileSync(txtPathB, 'utf8')).toContain('SMS 4 in Thread 2');
    expect(fs.readFileSync(txtPathB, 'utf8')).toContain('Contact B');
  });

  // 7b. File Exports: export all threads as CSV and TXT files
  test('7b. File Exports: export all threads as CSV and TXT files', async () => {
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);

    const csvPathAll = await appPage.triggerExportAllCsv();
    const txtPathAll = await appPage.triggerExportAllText();
    expect(csvPathAll).not.toBe('');
    expect(txtPathAll).not.toBe('');

    const csvContent = fs.readFileSync(csvPathAll, 'utf8');
    const txtContent = fs.readFileSync(txtPathAll, 'utf8');

    // Verify messages from Contact A (Thread 1)
    expect(csvContent).toContain('SMS 1 in Thread 1');
    expect(csvContent).toContain('Contact A');
    expect(txtContent).toContain('SMS 1 in Thread 1');
    expect(txtContent).toContain('Contact A');

    // Verify messages from Contact B (Thread 2)
    expect(csvContent).toContain('SMS 4 in Thread 2');
    expect(csvContent).toContain('Contact B');
    expect(txtContent).toContain('SMS 4 in Thread 2');
    expect(txtContent).toContain('Contact B');
  });

  // 8. Clearing loaded archive
  test('8. Clearing Archive: resets thread list, header title, and subtitle', async () => {
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);
    await appPage.clickThread(0);

    // Open sidebar on mobile to reveal clear button
    await ensureSidebarOpen(appPage.page);
    await appPage.page.locator('button', { hasText: 'Clear Loaded Archive' }).click({ force: true });
    await expect(appPage.threadListItems).toHaveCount(0);
    await expect(appPage.page.locator('header h1')).toHaveText('SMS Backup Reader');
    await expect(appPage.page.locator('header p')).toContainText('Select a conversation to begin reading');
  });

  // 9. MMS rendering
  test('9. MMS Rendering: loads media elements and PDF fallback links correctly', async () => {
    await appPage.uploadFile('sample_mms.xml');
    await ensureSidebarOpen(appPage.page);
    await appPage.clickThread(0);
    await expect(appPage.messageListItems).toHaveCount(4);

    // Image rendering
    const img = appPage.messageListItems.nth(0).locator('img');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('alt', 'image.png');

    // Video rendering
    const video = appPage.messageListItems.nth(1).locator('video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('controls', '');
    expect(await video.getAttribute('autoplay')).toBeNull();

    // Audio rendering
    const audio = appPage.messageListItems.nth(2).locator('audio');
    await expect(audio).toBeVisible();
    await expect(audio).toHaveAttribute('controls', '');
    expect(await audio.getAttribute('autoplay')).toBeNull();

    // PDF fallback/download link
    const downloadLink = appPage.messageListItems.nth(3).locator('button:has-text("document.pdf")');
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toContainText('document.pdf');
  });
});
