import { defineConfig } from '@playwright/test';

const channel = process.env.PLAYWRIGHT_CHANNEL?.trim() || undefined;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    channel,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
