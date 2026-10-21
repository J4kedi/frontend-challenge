import { addToCartFromDetail, expect, goToReview, mockControl, openApp, submitLogin, test, waitForRealtime } from './support/app'

test.describe('09 · tempo real durante o checkout', () => {
  test('alteração de preço via Socket.IO atualiza o resumo e exige nova confirmação', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const review = await goToReview(page)
    await expect(review.getByTestId('quote-total')).toHaveText('1.198 ETH')

    // The mock backend changes the price and publishes nft.updated over the socket.
    await waitForRealtime(page)
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
    await waitForRealtime(page)
    await mockControl(page, '/nfts/emerald-ape-042', { available: 0 })
    await expect(page.getByTestId('live-region')).toContainText('esgotou')
    await expect(review.getByTestId('quote-notice')).toContainText('não estão mais disponíveis')
    await expect(review.getByTestId('confirm-purchase')).toBeDisabled()
  })

  test('na página de pagamento, aceitar preços e remover o cupom não enviam o formulário', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await expect(page.getByRole('dialog', { name: 'Entrar' })).toBeVisible()
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)

    await waitForRealtime(page)
    await mockControl(page, '/nfts/emerald-ape-042', { priceEth: '1.29' })
    await page.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await expect(page.getByTestId('quote-notice')).toBeHidden()

    await page.getByText('Tem um código promocional?').filter({ visible: true }).click()
    await page.getByRole('textbox', { name: 'Código promocional' }).filter({ visible: true }).fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).filter({ visible: true }).click()
    const removeCoupon = page.getByRole('button', { name: 'Remover', exact: true }).filter({ visible: true })
    await removeCoupon.click()
    await expect(removeCoupon).toHaveCount(0)

    // Neither click sent the payment form: no review and no wallet error.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Conecte a carteira na rede escolhida para continuar.')).toHaveCount(0)
  })
})
