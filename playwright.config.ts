import { defineConfig, devices } from '@playwright/test';

const isExternalUrl = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for data consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for sequential tests
  reporter: 'list',
  timeout: 60000, // Increased for network latency
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start local server if not using external URL
  ...(isExternalUrl ? {} : {
    webServer: {
      command: 'npm run start',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000,
    },
  }),
});
