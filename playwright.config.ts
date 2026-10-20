import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
/** E2E_BASE_URL runs the same suite against a deployed URL (e.g. the Vercel demo) instead of a local preview. */
const EXTERNAL = process.env.E2E_BASE_URL

/**
 * E2E against the demo build (same bundle as the deploy, mocks enabled).
 * Visual baselines are Linux-only: font rasterization differs per OS, so other
 * platforms run every functional assertion and skip the pixel comparison.
 * Regenerate them in the official Linux image: `pnpm test:visual:update` (docs/quality/testing.md).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  reporter: [['html', { open: 'never' }], ['list']],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  ignoreSnapshots: process.platform !== 'linux',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: EXTERNAL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: EXTERNAL
    ? undefined
    : {
        command: 'pnpm build && pnpm preview',
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
