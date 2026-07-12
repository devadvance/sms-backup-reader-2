import { Page, Locator } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export class SMSBackupReaderPage {
  readonly page: Page;
  readonly fileInput: Locator;
  readonly threadListItems: Locator;
  readonly threadSearchInput: Locator;
  readonly chatContainer: Locator;
  readonly messageListItems: Locator;
  readonly themeToggleBtn: Locator;
  readonly exportCsvBtn: Locator;
  readonly exportTextBtn: Locator;
  readonly exportAllCsvBtn: Locator;
  readonly exportAllTxtBtn: Locator;
  readonly loadingProgressBar: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileInput = page.locator('[data-testid="file-upload-input"]');
    this.threadListItems = page.locator('[data-testid="thread-item"]');
    this.threadSearchInput = page.locator('[data-testid="thread-search"]');
    this.chatContainer = page.locator('[data-testid="chat-container"]');
    this.messageListItems = page.locator('[data-testid="message-item"]');
    this.themeToggleBtn = page.locator('[data-testid="theme-toggle"]');
    this.exportCsvBtn = page.locator('[data-testid="export-csv"]');
    this.exportTextBtn = page.locator('[data-testid="export-text"]');
    this.exportAllCsvBtn = page.locator('[data-testid="export-all-csv"]');
    this.exportAllTxtBtn = page.locator('[data-testid="export-all-txt"]');
    this.loadingProgressBar = page.locator('[data-testid="progress-bar"]');
    this.errorBanner = page.locator('[data-testid="error-banner"]');
    page.on('console', (msg) => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
  }

  async goto() {
    await this.page.goto('/');
  }

  async uploadFile(filename: string) {
    const filePath = path.resolve(process.cwd(), 'tests/e2e/fixtures', filename);
    await this.fileInput.setInputFiles(filePath);
  }

  async toggleTheme() {
    await this.themeToggleBtn.click({ force: true });
  }

  async changeLanguage(langCode: string) {
    await this.page.locator('[data-testid="language-select"]').selectOption(langCode);
  }

  async searchThreads(query: string) {
    await this.threadSearchInput.fill(query);
  }

  async clickThread(index: number) {
    await this.threadListItems.nth(index).dispatchEvent('click');
  }

  async triggerExportCsv(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportCsvBtn.click({ force: true });
    const download = await downloadPromise;
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    const stablePath = path.join(testResultsDir, `csv_${Date.now()}_${download.suggestedFilename()}`);
    await download.saveAs(stablePath);
    return stablePath;
  }

  async triggerExportText(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportTextBtn.click({ force: true });
    const download = await downloadPromise;
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    const stablePath = path.join(testResultsDir, `txt_${Date.now()}_${download.suggestedFilename()}`);
    await download.saveAs(stablePath);
    return stablePath;
  }

  async triggerExportAllCsv(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportAllCsvBtn.click({ force: true });
    const download = await downloadPromise;
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    const stablePath = path.join(testResultsDir, `csv_all_${Date.now()}_${download.suggestedFilename()}`);
    await download.saveAs(stablePath);
    return stablePath;
  }

  async triggerExportAllText(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportAllTxtBtn.click({ force: true });
    const download = await downloadPromise;
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    const stablePath = path.join(testResultsDir, `txt_all_${Date.now()}_${download.suggestedFilename()}`);
    await download.saveAs(stablePath);
    return stablePath;
  }
}
