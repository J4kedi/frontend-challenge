import { addToCartFromDetail, expect, goToReview, isMobile, openApp, submitLogin, test } from './support/app'

test.describe('06 · compra completa', () => {
  test('do catálogo ao recibo confirmado, como visitante que entra no meio do caminho', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')

    await expect(page.getByTestId('cart-line').filter({ visible: true })).toHaveCount(1)
    await expect(page.getByTestId('quote-total')).toHaveText('1.198 ETH')

    // Checkout is private: the visitor logs in over the cart and goes on with the cart merged.
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await expect(page.getByRole('dialog', { name: 'Entrar' })).toBeVisible()
    await expect(page).toHaveURL(/\/cart$/)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)

    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('conectada na Ethereum')

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const review = page.getByRole('dialog', { name: 'Revise sua compra' })
    await expect(review).toBeVisible()
    if (isMobile(page)) {
      // The smallest phones: the review must fit, with the total and the button in view.
      await page.setViewportSize({ width: 320, height: 720 })
      expect(await review.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0)
    }
    await expect(review.getByTestId('quote-total')).toHaveText('1.198 ETH')
    await review.getByTestId('confirm-purchase').click()

    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
    await expect(page.getByTestId('receipt-total')).toHaveText('1.198 ETH')
    await expect(page.getByTestId('receipt-tx')).toHaveText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)
    if (isMobile(page)) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    }

    // Only the purchased quantities leave the cart.
    await page.goto('/cart')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('comprar a última unidade não anuncia, para quem comprou, que a edição esgotou', async ({ page }) => {
    await openApp(page, '/nft/sage-nomad-009?edition=1-1')
    await expect(page.locator('#nft-title')).toBeVisible()
    await page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true }).click()
    await expect(page).toHaveURL(/\/cart$/)
    const review = await goToReview(page)

    // Everything the polite live region says from here on.
    await page.evaluate(() => {
      const region = document.querySelector('[data-testid="live-region"]')!
      const said: string[] = ((window as unknown as { said: string[] }).said = [])
      new MutationObserver(() => said.push(region.textContent ?? '')).observe(region, { childList: true, characterData: true, subtree: true })
    })
    await review.getByTestId('confirm-purchase').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    const said = await page.evaluate(() => (window as unknown as { said: string[] }).said)
    expect(said.some((text) => text.includes('Pagamento confirmado'))).toBe(true)
    expect(said.filter((text) => text.includes('esgotou'))).toEqual([])
  })

  test('o recibo de dois NFTs cabe numa janela de 1280×720', async ({ page }) => {
    test.skip(isMobile(page), 'o recibo é um modal a partir de 768 px')
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await addToCartFromDetail(page, 'sage-nomad-009')
    const review = await goToReview(page)
    await review.getByTestId('confirm-purchase').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })

    await page.setViewportSize({ width: 1280, height: 720 })
    const receipt = page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' })
    // The lines scroll inside the modal; the totals and the explorer link stay in view.
    await expect(receipt.getByRole('button', { name: 'Ver no Etherscan' })).toBeInViewport({ ratio: 1 })
    await expect(receipt.getByText('Taxa de rede')).toBeInViewport({ ratio: 1 })
    // At most 1 px from rounding (92dvh is fractional), never a cut-off line.
    expect(await receipt.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1)
  })
})
