import { expect, loginAs, mockControl, openApp, test, USERS } from './support/app'

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

  test('rota privada sem rede mostra o erro, sem cair em loop de login', async ({ page }) => {
    await openApp(page, '/')
    await loginAs(page, USERS.ana, '/')
    await mockControl(page, '/scenario', { name: 'offline' }, 'PUT')
    const visited: string[] = []
    page.on('framenavigated', (frame) => frame === page.mainFrame() && visited.push(new URL(frame.url()).pathname))

    await page.goto('/favorites')
    await expect(page.getByText('Esta página encontrou um erro')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('navigation', { name: 'Principal' }).or(page.getByRole('navigation', { name: 'Navegação inferior' }))).toBeVisible()
    // A stored token is not a refused session: never bounce through /login.
    await page.waitForTimeout(4000)
    expect(visited).not.toContain('/login')
    await expect(page).toHaveURL(/\/favorites$/)

    await mockControl(page, '/scenario', { name: 'default' }, 'PUT')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByText('Esta página encontrou um erro')).toBeHidden()
    await expect(page).toHaveURL(/\/favorites$/)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })
})
