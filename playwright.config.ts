import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run build && DATABASE_URL='sqlite:/tmp/service-proof-loop-e2e.db?mode=rwc' STATIC_DIR=dist PORT=4173 cargo run",
    url: 'http://127.0.0.1:4173/health',
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
});
