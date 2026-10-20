import type { Page } from '@playwright/test'
import { addToCartFromDetail, expect, openApp, submitLogin, test } from './support/app'

/**
 * Visual regression of the four screens the challenge names, on desktop and
 * mobile. Baselines are Linux-only (playwright.config.ts) and versioned in
 * tests/e2e/__screenshots__. Data is the deterministic seed.
 */
async function settle(page: Page) {
  // The demo's mock panel is not part of the Figma screens.
  await page.addStyleTag({ content: '[data-mock-panel] { display: none !important; }' })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

test.describe('13 · regressão visual @visual', () => {
  test('início', async ({ page }) => {
    await openApp(page, '/')
    await expect(page.getByTestId('catalog-status')).toHaveText('239 NFTs encontrados')
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe do NFT', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await expect(page.getByTestId('quote-total')).toHaveText('1.198 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByTestId('quote-total')).toHaveText('1.198 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
