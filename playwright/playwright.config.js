import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 900000,
  expect: { timeout: 15000 },
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 2,
  workers: 1,
  reporter: [
    ['html'],
    ['allure-playwright'],
    ['line']
  ],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    viewport: null,
    actionTimeout: 120000,
    navigationTimeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--use-file-for-fake-audio-capture=./testdata/audio/meeting-notes-sample.wav',
            '--ignore-certificate-errors',
            '--disable-web-security'
          ]
        }
      },
    },
  ],
});
