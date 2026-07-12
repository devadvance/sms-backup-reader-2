import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Maximum time one test can run for. */
  timeout: 30000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 5000
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. Match with vite.config.ts server port */
    baseURL: 'http://127.0.0.1:3000/sms-backup-reader-2/',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'firefox-mobile',
      use: {
        ...devices['Pixel 5'],
        defaultBrowserType: 'firefox'
      }
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 12'] }
    }
  ],

  /* Run the local Vite dev server before starting the tests */
  webServer: {
    command: 'npm run build && vite preview --host 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000/sms-backup-reader-2/',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000
  }
});
