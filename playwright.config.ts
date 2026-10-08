import { defineConfig } from '@playwright/test';

// Optional foundation-shell checks. This is not the future scan golden-path suite.
export default defineConfig({
  testDir: './frontend/tests',
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium' },
  projects: [
    { name: 'mobile-shell', use: { viewport: { width: 360, height: 800 } } },
    { name: 'desktop-shell', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
