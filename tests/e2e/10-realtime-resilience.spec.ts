import { addToCartFromDetail, expect, goToReview, mockControl, openApp, ordersOf, test, waitForMocks } from './support/app'

test.describe('10 · eventos, desconexão e pedido pendente', () => {
  test('eventos duplicados ou antigos não regridem o estado', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042', 'events-chaos')
    const price = page.getByTestId('detail-price')
    await expect(price).toContainText('1.19 ETH')
    // Every price the page shows from here on: a regression must not appear even for a frame.
    await page.evaluate(() => {
      const read = () => document.querySelector('[data-testid="detail-price"]')?.textContent?.match(/[\d.]+ ETH/)?.[0] ?? ''
      const shown = [read()]
      ;(window as unknown as { shownPrices: string[] }).shownPrices = shown
      new MutationObserver(() => read() !== shown.at(-1) && shown.push(read())).observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
      })
    })

    // events-chaos: each event arrives twice and is followed by an older version.
    await mockControl(page, '/nfts/emerald-ape-042', { priceEth: '1.49' })
    await expect(price).toContainText('1.49 ETH')
    await mockControl(page, '/events/replay', { mode: 'stale' })
    await mockControl(page, '/events/replay', { mode: 'duplicate' })
    // Events go out in order: once this newer one shows, everything before it was handled.
    await mockControl(page, '/nfts/emerald-ape-042', { priceEth: '1.69' })
    await expect(price).toContainText('1.69 ETH')
    const shown = await page.evaluate(() => (window as unknown as { shownPrices: string[] }).shownPrices)
    expect(shown).toEqual(['1.19 ETH', '1.49 ETH', '1.69 ETH'])
  })

  test('reconexão reconcilia com a API o que mudou enquanto estava offline', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    const price = page.getByTestId('detail-price')
    await expect(price).toContainText('1.19 ETH')
    const offline = page.getByText('Conexão em tempo real perdida')

    // The server stays down for 3 s: the price change published meanwhile reaches nobody.
    await mockControl(page, '/socket/drop', { seconds: 3 })
    await expect(offline).toBeVisible()
    await mockControl(page, '/nfts/emerald-ape-042', { priceEth: '1.59' })
    await expect(offline).toBeVisible()
    await expect(price).toContainText('1.19 ETH')

    // Back online, the client refetches what is on screen and gets the new price over REST.
    await expect(offline).toBeHidden({ timeout: 10_000 })
    await expect(price).toContainText('1.59 ETH')
    await expect(page.getByText('Conexão em tempo real restabelecida')).toBeVisible()
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
