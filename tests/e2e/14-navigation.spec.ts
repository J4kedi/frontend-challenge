import { expect, isMobile, loginAs, openApp, test, USERS } from './support/app'

test.describe('14 · navegação do header', () => {
  test('header fixo, item ativo acompanha a seção e itens fora do escopo avisam', async ({ page }) => {
    test.skip(isMobile(page), 'O header de navegação é desktop; no mobile a navegação é a tab bar')
    await openApp(page, '/')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    const home = nav.getByRole('link', { name: 'Início' })
    const market = nav.getByRole('link', { name: 'Mercado' })
    await expect(home).toHaveAttribute('aria-current', 'page')
    await expect(market).not.toHaveAttribute('aria-current', 'page')

    // Mercado scrolls to the market section and becomes the active item.
    await market.click()
    await expect(market).toHaveAttribute('aria-current', 'page')
    await expect(home).not.toHaveAttribute('aria-current', 'page')
    await expect(page.locator('#mercado')).toBeInViewport()

    // The header stays on screen while scrolling, so other items remain reachable.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.getByRole('banner')).toBeInViewport()

    // Out-of-scope items say so instead of silently doing nothing.
    // aria-disabled keeps it focusable and clickable for people; Playwright needs force for that state.
    await nav.getByRole('button', { name: /Criadores/ }).click({ force: true })
    await expect(page.getByText('Criadores ainda não faz parte desta demonstração.')).toBeVisible()

    // Back to the top: Início is active again; clicking it on the home page scrolls up.
    await market.click()
    await expect(market).toHaveAttribute('aria-current', 'page')
    await home.click()
    await expect(home).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5)

    // From another page, Mercado returns to the market section of the home.
    await page.goto('/cart')
    await expect(market).toHaveAttribute('aria-current', 'page')
    await market.click()
    await expect(page).toHaveURL(/\/#mercado$/)
    await expect(page.locator('#mercado')).toBeInViewport()
  })

  test('header e rodapé cabem em 768 px com o nome do usuário', async ({ page }) => {
    test.skip(isMobile(page), 'Largura de tablet a partir do projeto desktop')
    await openApp(page, '/')
    await loginAs(page, USERS.ana, '/nft/emerald-ape-042')
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByRole('link', { name: USERS.ana.name })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    // The newsletter field takes its own row below lg instead of a 4th narrow column.
    const field = await page.getByLabel('E-mail para a newsletter').boundingBox()
    expect(field?.width).toBeGreaterThan(200)
  })

  test('Voltar no detalhe aberto por link direto fica no site', async ({ page }) => {
    test.skip(!isMobile(page), 'O botão Voltar sobre a arte é do mobile')
    await openApp(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: 'Voltar' }).first().click()
    await expect(page).toHaveURL(/\/#mercado$/)
    await expect(page.locator('#mercado')).toBeVisible()
  })
})
