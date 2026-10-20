import { addToCartFromDetail, expect, goToReview, mockControl, openApp, test } from './support/app'

test.describe('09 · tempo real durante o checkout', () => {
  test('alteração de preço via Socket.IO atualiza o resumo e exige nova confirmação', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const review = await goToReview(page)
    await expect(review.getByTestId('quote-total')).toHaveText('1.198 ETH')

    // The mock backend changes the price and publishes nft.updated over the socket.
    await mockControl(page, '/nfts/emerald-ape-042', { priceEth: '1.29' })
    await expect(page.getByTestId('live-region')).toContainText('o preço mudou de 1.19 ETH para 1.29 ETH')
    await expect(review.getByTestId('quote-total')).toHaveText('1.298 ETH')
    await expect(review.getByTestId('quote-notice')).toContainText('O preço de Emerald Ape #042 mudou')
    await expect(review.getByTestId('confirm-purchase')).toBeDisabled()

    await review.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await expect(review.getByTestId('confirm-purchase')).toBeEnabled()
    await review.getByTestId('confirm-purchase').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('1.298 ETH')
  })

  test('edição esgotada durante o checkout bloqueia a compra', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const review = await goToReview(page)
    await mockControl(page, '/nfts/emerald-ape-042', { available: 0 })
    await expect(page.getByTestId('live-region')).toContainText('esgotou')
    await expect(review.getByTestId('quote-notice')).toContainText('não estão mais disponíveis')
    await expect(review.getByTestId('confirm-purchase')).toBeDisabled()
  })
})
