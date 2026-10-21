import { addToCartFromDetail, expect, loginAs, mockControl, openApp, submitLogin, test, USERS } from './support/app'

test.describe('12 · carregamento e falhas', () => {
  test('rede lenta mostra skeletons com as dimensões do conteúdo', async ({ page }) => {
    await openApp(page, '/', 'slow')
    await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
    const placeholder = await page.getByTestId('catalog-skeleton').locator('li').first().boundingBox()
    await expect(page.getByTestId('catalog-status')).toHaveText('239 NFTs encontrados', { timeout: 15_000 })
    await expect(page.getByTestId('catalog-skeleton')).toBeHidden()
    // The first card takes the place and the size of the first skeleton: nothing jumps.
    const card = await page.getByTestId('nft-card').first().locator('xpath=..').boundingBox()
    expect(Math.abs(card!.x - placeholder!.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(card!.y - placeholder!.y)).toBeLessThanOrEqual(2)
    expect(Math.abs(card!.width - placeholder!.width)).toBeLessThanOrEqual(2)
    expect(Math.abs(card!.height - placeholder!.height) / placeholder!.height).toBeLessThanOrEqual(0.1)

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

  test('aba parada continua nos mocks depois que o navegador desliga o service worker', async ({ page }) => {
    await page.clock.install()
    await openApp(page, '/')
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    // Chrome stops only a worker that had no events for 30 s: let the boot requests settle
    // (the socket connection refetches what is on screen) before stopping it.
    await page.waitForLoadState('networkidle')
    const passedThrough: string[] = []
    page.on('response', (response) => {
      if (response.url().includes('/api/') && !response.fromServiceWorker()) passedThrough.push(response.url())
    })

    // What Chrome does to the worker of an idle tab; the restarted worker forgets the tab.
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('ServiceWorker.enable')
    await cdp.send('ServiceWorker.stopAllWorkers')
    await page.clock.fastForward(25_000)

    await page.getByTestId('nft-card').first().click()
    await expect(page.locator('#nft-title')).toBeVisible()
    expect(passedThrough).toEqual([])
  })

  test('sem rede, a revisão não abre com valores que não puderam ser conferidos', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('conectada')

    await mockControl(page, '/scenario', { name: 'offline' }, 'PUT')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Não foi possível confirmar os valores agora.')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('dialog', { name: 'Revise sua compra' })).toHaveCount(0)
  })
})
