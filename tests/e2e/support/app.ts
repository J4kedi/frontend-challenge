import { test as base, expect, type Page } from '@playwright/test'

export const USERS = {
  ana: { email: 'ana@kurio.test', password: 'kurio2026', name: 'Ana Colecionadora' },
  bruno: { email: 'bruno@kurio.test', password: 'kurio2026', name: 'Bruno Arte' },
} as const
type TestUser = (typeof USERS)[keyof typeof USERS]

/**
 * Opens a route on a fresh seed (`?mock-reset`), optionally under a mock
 * scenario, and waits until MSW intercepts requests and sockets.
 */
export async function openApp(page: Page, path = '/', scenario?: string) {
  const url = new URL(path, 'http://placeholder')
  url.searchParams.set('mock-reset', '')
  if (scenario) url.searchParams.set('scenario', scenario)
  await page.goto(`${url.pathname}${url.search}${url.hash}`)
  await waitForMocks(page)
}

export async function waitForMocks(page: Page) {
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

/** Fills the login form (modal on desktop, page on mobile) and submits it. */
export async function submitLogin(page: Page, user: TestUser = USERS.ana) {
  await page.getByLabel('E-mail', { exact: true }).fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** Logs in from the login route and waits to land on `expectedPath`. */
export async function loginAs(page: Page, user: TestUser = USERS.ana, redirect = '/') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await waitForMocks(page)
  await submitLogin(page, user)
  await expect(page).not.toHaveURL(/\/login/)
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/** Adds the default edition of an NFT to the cart from its detail page. */
export async function addToCartFromDetail(page: Page, nftId: string, { goToCart = true } = {}) {
  await page.goto(`/nft/${nftId}`)
  await waitForMocks(page)
  await expect(page.locator('#nft-title')).toBeVisible()
  if (goToCart) {
    await page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true }).click()
    await expect(page).toHaveURL(/\/cart$/)
  } else {
    await page.getByRole('button', { name: 'Adicionar ao carrinho sem sair da página' }).click()
  }
}

export const test = base
export { expect }
