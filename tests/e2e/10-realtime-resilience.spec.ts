import { addToCartFromDetail, expect, goToReview, mockControl, openApp, ordersOf, test, waitForMocks } from './support/app'

test.describe('10 · eventos, desconexão e pedido pendente', () => {
  test('eventos duplicados ou antigos não regridem o estado', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042', 'events-chaos')
    const price = page.getByTestId('detail-price')
    await expect(price).toContainText('1.19 ETH')

    // events-chaos: the event arrives twice and is followed by an older version.
    await mockControl(page, '/nfts/emerald-ape-042', { priceEth: '1.49' })
    await expect(price).toContainText('1.49 ETH')
    await page.waitForTimeout(500)
    await expect(price).toContainText('1.49 ETH')

    await mockControl(page, '/events/replay', { mode: 'stale' })
    await mockControl(page, '/events/replay', { mode: 'duplicate' })
    await page.waitForTimeout(500)
    await expect(price).toContainText('1.49 ETH')
  })

  test('reconexão reconcilia com a API o que mudou enquanto estava offline', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    const price = page.getByTestId('detail-price')
    await expect(price).toContainText('1.19 ETH')
    await mockControl(page, '/socket/drop')
    await expect(page.getByText('Conexão em tempo real perdida')).toBeVisible()
    await expect(page.getByText('Conexão em tempo real perdida')).toBeHidden({ timeout: 10_000 })
    await mockControl(page, '/nfts/emerald-ape-042', { priceEth: '1.59' })
    await expect(price).toContainText('1.59 ETH')
  })

  test('pedido pendente sobrevive a desconexão e reload sem criar outra compra', async ({ page }) => {
    await openApp(page, '/', 'slow')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const review = await goToReview(page)
    await review.getByTestId('confirm-purchase').click()
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 20_000 })
    await mockControl(page, '/socket/drop')
    await page.reload()
    await waitForMocks(page)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 20_000 })
    expect(await ordersOf(page)).toHaveLength(1)
  })
})
