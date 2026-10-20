import { expect, isMobile, mockControl, openApp, test, waitForMocks } from './support/app'

test.describe('02 · detalhe do NFT', () => {
  test('acesso direto, edição indisponível e limite de quantidade', async ({ page }) => {
    await openApp(page, '/')
    await mockControl(page, '/nfts/emerald-ape-042', { editionId: 'emerald-ape-042:1-1', available: 0 })
    await mockControl(page, '/nfts/emerald-ape-042', { editionId: 'emerald-ape-042:1-10', available: 5 })

    await page.goto('/nft/emerald-ape-042?edition=1-1')
    await waitForMocks(page)
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Edição 1\/1, esgotada/ })).toBeChecked()
    await expect(page.getByText('Esta edição esgotou. Escolha outra edição.')).toBeVisible()
    const buy = page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true })
    await expect(buy).toBeDisabled()

    await page.getByRole('radio', { name: /Edição 1\/10/ }).click()
    await expect(page).toHaveURL(/edition=1-10/)
    await expect(buy).toBeEnabled()
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
    await plus.click()
    await expect(plus).toBeDisabled()
    await expect(page.getByText('Máximo de 2 por pedido nesta edição.')).toBeVisible()
  })

  test('NFT inexistente mostra a página de não encontrado', async ({ page }) => {
    await openApp(page, '/nft/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('rota inexistente mostra 404', async ({ page }) => {
    await openApp(page, '/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
