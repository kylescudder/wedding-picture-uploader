import { defineConfig } from '@playwright/test'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl)
  throw new Error(
    'Set TEST_DATABASE_URL to a disposable local PostgreSQL database ending in _test'
  )
const target = new URL(databaseUrl)
if (
  !['127.0.0.1', 'localhost'].includes(target.hostname) ||
  !target.pathname.endsWith('_test')
) {
  throw new Error(
    'E2E tests require a disposable local database ending in _test'
  )
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: '.artifacts/tanstack-migration/test-results',
  use: {
    baseURL: 'http://127.0.0.1:3190',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }
  ],
  webServer: {
    command: 'bun run db:migrate && bun run build && bun run start',
    url: 'http://127.0.0.1:3190',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { DATABASE_URL: databaseUrl, HOST: '127.0.0.1', PORT: '3190' }
  }
})
