import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    // GitHub Actions: emit annotations so failures show inline on the PR
    ...(process.env.CI ? [['github'] as [string]] : []),
  ],
  use: {
    // Use PLAYWRIGHT_BASE_URL when set (scheduled runs against live dev/staging URL).
    // Fall back to localhost for local dev and PR CI runs that start the webServer below.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  // Start Next.js dev server when no external URL is provided.
  // In CI (pr-check.yml), PLAYWRIGHT_BASE_URL is NOT set so this runs.
  // In scheduled runs (qa-e2e.yml), PLAYWRIGHT_BASE_URL points at the live dev/staging URL
  // so webServer is skipped and tests run directly against the deployed environment.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          PORT: '3000',
          HOSTNAME: '0.0.0.0',
        },
      },
})
