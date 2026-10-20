import { test as base, expect, type Page } from '@playwright/test'

export const USERS = {
  ana: { email: 'ana@kurio.test', password: 'kurio2026', name: 'Ana Colecionadora' },
  bruno: { email: 'bruno@kurio.test', password: 'kurio2026', name: 'Bruno Arte' },
} as const

/**
 * Opens a route on a fresh seed (`?mock-reset`), optionally under a mock
 * scenario, and waits until MSW intercepts requests and sockets.
 */
export async function openApp(page: Page, path = '/', scenario?: string) {
  const url = new URL(path, 'http://placeholder')
  url.searchParams.set('mock-reset', '')
  if (scenario) url.searchParams.set('scenario', scenario)
  await page.goto(`${url.pathname}${url.search}${url.hash}`)
  await expect(page.locator('html[data-mocks="ready"]')).toBeAttached()
}

/**
 * Calls the mock control API from inside the page: MSW handlers only exist in
 * the browser, so Playwright's `request` fixture cannot reach them.
 */
export async function mockControl(page: Page, path: string, body?: unknown, method = 'POST') {
  return page.evaluate(
    async ({ path, body, method }) => {
      const response = await fetch(`/api/__mock${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return { status: response.status, body: (await response.json()) as unknown }
    },
    { path, body, method },
  )
}

export const test = base
export { expect }
