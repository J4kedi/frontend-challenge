import { expect, mockControl, openApp, submitLogin, test, waitForMocks } from './support/app'

test.describe('04 · favoritos', () => {
  test('persistem para o usuário e voltam ao estado anterior quando a mutation falha', async ({ page }) => {
    await openApp(page, '/login?redirect=%2Fnft%2Femerald-ape-042')
    await submitLogin(page)
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)

    const heart = page.getByRole('button', { name: /lista de interesse/ }).filter({ visible: true }).first()
    await expect(heart).toHaveAttribute('aria-pressed', 'false')
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
    // Optimistic first; wait for the API before reloading.
    await expect(heart).not.toHaveAttribute('aria-busy', 'true')

    await page.reload()
    await waitForMocks(page)
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/favorites')
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
    await expect(page.getByTestId('nft-card').filter({ hasText: 'Emerald Ape #042' })).toBeVisible()

    // Failure: the optimistic change is rolled back and the user is told.
    await page.goto('/nft/emerald-ape-042')
    await waitForMocks(page)
    await mockControl(page, '/scenario', { name: 'mutation-error' }, 'PUT')
    await heart.click()
    await expect(page.getByText(/Não foi possível atualizar Emerald Ape #042/)).toBeVisible()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
  })

  test('visitante é levado ao login ao favoritar', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: /lista de interesse/ }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })
})
