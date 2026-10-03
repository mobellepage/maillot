import { defineConfig, devices } from '@playwright/test';

// Two suites:
//  * smoke   — UI, routing and resilience against an unreachable backend,
//              so it never touches real data. Runs everywhere.
//  * backend — the real marketplace flow against a local Supabase stack
//              seeded by supabase/seed.sql. Runs when E2E_SUPABASE_URL is set
//              (CI does `supabase start` first).
const PORT = 4799;
const backendUrl = process.env.E2E_SUPABASE_URL;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'smoke', testDir: 'e2e/smoke', use: { ...devices['Desktop Chrome'] } },
    { name: 'smoke-mobile', testDir: 'e2e/smoke', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
    ...(backendUrl ? [{ name: 'backend', testDir: 'e2e/backend', use: { ...devices['Desktop Chrome'] } }] : [])
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: {
      // Real env vars take precedence over .env.local in Vite.
      VITE_SUPABASE_URL: backendUrl || 'http://127.0.0.1:9',
      VITE_SUPABASE_ANON_KEY: process.env.E2E_SUPABASE_ANON_KEY || 'e2e-offline'
    }
  }
});
