import { addToCartFromDetail, expect, openApp, submitLogin, test } from './support/app'

test.describe('06 · compra completa', () => {
  test('do catálogo ao recibo confirmado, como visitante que entra no meio do caminho', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')

    await expect(page.getByTestId('cart-line').filter({ visible: true })).toHaveCount(1)
    await expect(page.getByTestId('quote-total')).toHaveText('1.198 ETH')

    // Checkout is private: the visitor logs in and comes back with the cart merged.
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)

    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('conectada na Ethereum')

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const review = page.getByRole('dialog', { name: 'Revise sua compra' })
    await expect(review).toBeVisible()
    await expect(review.getByTestId('quote-total')).toHaveText('1.198 ETH')
    await review.getByTestId('confirm-purchase').click()

    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
    await expect(page.getByTestId('receipt-total')).toHaveText('1.198 ETH')
    await expect(page.getByTestId('receipt-tx')).toHaveText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)

    // Only the purchased quantities leave the cart.
    await page.goto('/cart')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })
})
