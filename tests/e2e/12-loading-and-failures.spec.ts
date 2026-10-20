import { expect, openApp, test } from './support/app'

test.describe('12 · carregamento e falhas', () => {
  test('rede lenta mostra skeletons com as dimensões do conteúdo', async ({ page }) => {
    await openApp(page, '/', 'slow')
    await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
    await expect(page.getByTestId('catalog-status')).toHaveText('239 NFTs encontrados', { timeout: 15_000 })
    await expect(page.getByTestId('catalog-skeleton')).toBeHidden()

    await page.goto('/nft/emerald-ape-042')
    await expect(page.getByTestId('detail-skeleton')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible({ timeout: 15_000 })
  })

  test('falha 503 mostra erro e recupera com "Tentar novamente"', async ({ page }) => {
    await openApp(page, '/', 'http-5xx')
    // The query retries twice by itself; the third failure reaches the screen.
    await expect(page.getByText('Não foi possível carregar o catálogo')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Tentar novamente' }).first().click()
    await expect(page.getByTestId('catalog-status')).toHaveText('239 NFTs encontrados', { timeout: 15_000 })
  })

  test('sem conexão informa o problema', async ({ page }) => {
    await openApp(page, '/', 'offline')
    await expect(page.getByText('Sem conexão com o servidor. Verifique sua internet e tente novamente.').first()).toBeVisible({ timeout: 20_000 })
  })
})
