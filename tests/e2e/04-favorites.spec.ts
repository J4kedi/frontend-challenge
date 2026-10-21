import { expect, loginAs, mockControl, openApp, submitLogin, test, USERS, waitForMocks } from './support/app'

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

  test('visitante entra sem sair do detalhe e o favorito é salvo em seguida', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    const heart = page.getByRole('button', { name: /lista de interesse/ }).filter({ visible: true }).first()
    await heart.click()

    // The login opens over the page the visitor is on; the URL does not change.
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await expect(dialog).toContainText('Emerald Ape #042 vai para a sua lista de interesse assim que você entrar.')
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
    await dialog.getByRole('button', { name: 'Preencher' }).click()
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Emerald Ape #042 salvo na sua lista de interesse.')).toBeVisible()
  })

  test('dois cliques rápidos com rede lenta terminam no último clique, na tela e na API', async ({ page }) => {
    await openApp(page, '/')
    await loginAs(page, USERS.bruno, '/')
    // The simulated latency is a hash of method + URL: pick the NFT whose PUT is
    // slowest relative to its DELETE, so unserialized writes would land reversed.
    const nftId = await page.evaluate(async () => {
      const hash = (text: string) => {
        let h = 0x811c9dc5
        for (let i = 0; i < text.length; i++) {
          h ^= text.charCodeAt(i)
          h = Math.imul(h, 0x01000193)
        }
        return h >>> 0
      }
      const latency = (method: string, id: string) => 1800 + (hash(`${method} ${location.origin}/api/me/favorites/${id}`) % 800)
      const list = (await fetch('/api/nfts?pageSize=48').then((r) => r.json())) as { items: { id: string }[] }
      return list.items.map((n) => ({ id: n.id, lead: latency('PUT', n.id) - latency('DELETE', n.id) })).sort((a, b) => b.lead - a.lead)[0]!.id
    })
    await page.goto(`/nft/${nftId}`)
    await waitForMocks(page)
    await mockControl(page, '/scenario', { name: 'slow' }, 'PUT')
    const heart = page.getByRole('button', { name: /lista de interesse/ }).filter({ visible: true }).first()
    await expect(heart).toHaveAttribute('aria-pressed', 'false')

    await heart.click()
    await page.waitForTimeout(150)
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'false')
    // Both writes done: the screen never flips back, and the API agrees.
    await expect(heart).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 })
    await expect(heart).toHaveAttribute('aria-pressed', 'false')
    const saved = await page.evaluate(async () => {
      const { token } = JSON.parse(localStorage.getItem('kurio:session') ?? '{}') as { token?: string }
      return ((await fetch('/api/me/favorites', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())) as { nftIds: string[] }).nftIds
    })
    expect(saved).not.toContain(nftId)
  })
})
