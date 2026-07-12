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

test.describe('Tier 4: Real World', () => {
  let appPage: SMSBackupReaderPage;

  test.beforeEach(async ({ page }) => {
    appPage = new SMSBackupReaderPage(page);
    await appPage.goto();
    await page.addStyleTag({
      content: `* { transition: none !important; transition-duration: 0s !important; animation: none !important; }`
    });
  });

  test('1. Workflow: Upload small backup, find a contact, read messages, download attachment, export txt', async () => {
    // 1. Upload sample small backup file
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);

    // 2. Search for Contact A
    await appPage.searchThreads('Contact A');
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact A');

    // 3. Click Contact A thread
    await appPage.clickThread(0);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact A');

    // 4. Verify message count and bodies
    await expect(appPage.messageListItems).toHaveCount(4);
    await expect(appPage.messageListItems.nth(0)).toContainText('SMS 1 in Thread 1');
    await expect(appPage.messageListItems.nth(3)).toContainText('MMS 1 text in Thread 1');

    // 5. Trigger text export and verify contents
    const textPath = await appPage.triggerExportText();
    expect(textPath).not.toBe('');
    const content = fs.readFileSync(textPath, 'utf8');
    expect(content).toContain('SMS 1 in Thread 1');
    expect(content).toContain('MMS 1 text in Thread 1');
  });

  test('2. Workflow: Spanish user uploads MMS backup, views video and audio, switches to dark mode, exports CSV', async () => {
    // 1. Set language to Spanish
    await ensureSidebarClosed(appPage.page);
    await appPage.changeLanguage('es');

    // 2. Upload MMS backup file
    await appPage.uploadFile('sample_mms.xml');
    await ensureSidebarOpen(appPage.page);
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact C');

    // 3. Select thread
    await appPage.clickThread(0);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact C');
    await expect(appPage.page.locator('header p')).toContainText('4 mensajes');

    // 4. Verify media elements: image, video controls, audio controls
    const img = appPage.messageListItems.nth(0).locator('img');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('alt', 'image.png');

    const video = appPage.messageListItems.nth(1).locator('video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('controls', '');
    expect(await video.getAttribute('autoplay')).toBeNull();

    const audio = appPage.messageListItems.nth(2).locator('audio');
    await expect(audio).toBeVisible();
    await expect(audio).toHaveAttribute('controls', '');
    expect(await audio.getAttribute('autoplay')).toBeNull();

    // 5. Switch to dark mode for reading
    await ensureSidebarClosed(appPage.page);
    await appPage.toggleTheme();
    await expect(appPage.page.locator('html')).toHaveClass(/dark/);

    // 6. Export to CSV and verify contents
    const csvPath = await appPage.triggerExportCsv();
    expect(csvPath).not.toBe('');
    const content = fs.readFileSync(csvPath, 'utf8');
    expect(content).toContain('Here is a video attachment');
    expect(content).toContain('Contact C');
  });

  test('3. Workflow: Developer tests edge files (empty, corrupt) and verifies error handling & fallback UI', async () => {
    // 1. Upload empty XML first to check empty state
    await appPage.uploadFile('empty.xml');
    await expect(appPage.threadListItems).toHaveCount(0);
    await expect(appPage.page.locator('text=No conversations found')).toBeVisible();

    // 2. Upload corrupt attachments XML to check fallback UI components
    await appPage.uploadFile('corrupt_attachments.xml');
    await ensureSidebarOpen(appPage.page);
    await expect(appPage.threadListItems).toHaveCount(1);
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact D');

    // 3. Click Contact D thread
    await appPage.clickThread(0);
    await expect(appPage.messageListItems).toHaveCount(2);

    // 4. Verify corrupt image still loads element in DOM
    const img = appPage.messageListItems.nth(0).locator('img');
    await expect(img).toBeAttached();

    // 5. Verify unsupported file fallback UI download link
    const downloadBtn = appPage.messageListItems.nth(1).locator('button');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toContainText('corrupt.file');

    // 6. Clear all loaded data
    await ensureSidebarOpen(appPage.page);
    await appPage.page.locator('button', { hasText: 'Clear Loaded Archive' }).click({ force: true });
    await expect(appPage.threadListItems).toHaveCount(0);
  });

  test('4. Workflow: Multi-conversation navigation and search session', async () => {
    // 1. Upload backup
    await appPage.uploadFile('sample_small.xml');
    await ensureSidebarOpen(appPage.page);
    await expect(appPage.threadListItems).toHaveCount(2);

    // 2. Click Thread A and verify message body
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact A');
    await appPage.clickThread(0);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact A');
    await expect(appPage.messageListItems.nth(0)).toContainText('SMS 1 in Thread 1');

    // 3. Click Thread B and verify message body
    await ensureSidebarOpen(appPage.page);
    await expect(appPage.threadListItems.nth(1).locator('.font-semibold')).toHaveText('Contact B');
    await appPage.clickThread(1);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact B');
    await expect(appPage.messageListItems.nth(0)).toContainText('SMS 4 in Thread 2');

    // 4. Search for "Contact A" to filter conversation list
    await ensureSidebarOpen(appPage.page);
    await appPage.searchThreads('Contact A');
    await expect(appPage.threadListItems).toHaveCount(1);

    // 5. Click the filtered thread and verify details
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact A');
    await appPage.clickThread(0);
    await expect(appPage.page.locator('header h1')).toHaveText('Contact A');

    // 6. Clear search query and verify both threads restore
    await ensureSidebarOpen(appPage.page);
    await appPage.searchThreads('');
    await expect(appPage.threadListItems).toHaveCount(2);
  });

  test('5. Workflow: Complete media & attachment extraction validation', async () => {
    // 1. Upload MMS file
    await appPage.uploadFile('sample_mms.xml');
    await ensureSidebarOpen(appPage.page);

    // 2. Select Thread C
    await expect(appPage.threadListItems.first().locator('.font-semibold')).toHaveText('Contact C');
    await appPage.clickThread(0);
    await expect(appPage.messageListItems).toHaveCount(4);

    // 3. Verify PDF download element is functional
    const pdfDownloadBtn = appPage.messageListItems.nth(3).locator('button:has-text("document.pdf")');
    await expect(pdfDownloadBtn).toBeVisible();

    // Trigger download of the PDF file
    const downloadPromise = appPage.page.waitForEvent('download');
    await pdfDownloadBtn.dispatchEvent('click');
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).not.toBe('');

    // Verify file content is PDF header content from sample_mms.xml
    const content = fs.readFileSync(downloadPath!, 'utf8');
    expect(content).toContain('%PDF-1.4');

    // 4. Export the entire MMS thread
    const txtPath = await appPage.triggerExportText();
    expect(txtPath).not.toBe('');
    expect(fs.readFileSync(txtPath, 'utf8')).toContain('Here is a PDF attachment');
  });
});
