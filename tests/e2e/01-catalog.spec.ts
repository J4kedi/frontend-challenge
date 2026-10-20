import { expect, openApp, test, withFilters } from './support/app'

const cardNames = (page: import('@playwright/test').Page) => page.locator('[data-testid="nft-card"] h3')

test.describe('01 · catálogo', () => {
  test('busca, filtros combinados, ordenação, paginação e restauração pelo histórico', async ({ page }) => {
    await openApp(page, '/')
    const status = page.getByTestId('catalog-status')
    await expect(status).toHaveText('239 NFTs encontrados')

    await page.getByRole('searchbox', { name: /Buscar NFTs/ }).fill('sage')
    await expect(page).toHaveURL(/q=sage/)
    await expect(status).not.toHaveText('239 NFTs encontrados')
    const searched = await status.textContent()

    await withFilters(page, async () => {
      await page.getByRole('button', { name: /^Arte digital/ }).click()
      await page.getByRole('button', { name: /^Ethereum/ }).click()
    })
    await expect(page).toHaveURL(/collections=.*arte-digital/)
    await expect(page).toHaveURL(/networks=.*ethereum/)
    await expect(status).not.toHaveText(searched!)
    for (const name of await cardNames(page).allTextContents()) expect(name).toMatch(/Sage/)

    // Clearing the search keeps both filters; sorting by lowest price orders the cards.
    await page.getByRole('searchbox', { name: /Buscar NFTs/ }).fill('')
    await expect(page).not.toHaveURL(/q=/)
    await withFilters(page, async () => {
      await page.getByRole('combobox', { name: /Ordenar por/ }).click()
      await page.getByRole('option', { name: 'Menor preço' }).click()
    })
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
    const prices = (await page.locator('[data-testid="nft-card"] [id$="-price"] > span:first-child').allTextContents()).map((text) =>
      Number(text.replace(/[^\d.]/g, '')),
    )
    expect(prices.length).toBeGreaterThan(1)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))

    // Dropping one filter keeps the other (and the sort); then page 2 and back.
    await withFilters(page, async () => {
      await page.getByRole('button', { name: /^Ethereum/ }).click()
    })
    await expect(page).not.toHaveURL(/networks=/)
    await expect(page.getByTestId('catalog-status')).toHaveText('33 NFTs encontrados')
    const firstOfPage1 = await cardNames(page).first().textContent()
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(cardNames(page).first()).not.toHaveText(firstOfPage1!)
    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
    await expect(cardNames(page).first()).toHaveText(firstOfPage1!)
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(cardNames(page).first()).toHaveText(firstOfPage1!)
  })

  test('respostas fora de ordem não sobrescrevem o filtro atual', async ({ page }) => {
    await openApp(page, '/', 'jitter')
    const status = page.getByTestId('catalog-status')
    await expect(status).toHaveText('239 NFTs encontrados')
    await withFilters(page, async () => {
      await page.getByRole('button', { name: /^Música/ }).click()
      await page.getByRole('button', { name: /^Música/ }).click()
      await page.getByRole('button', { name: /^Jogos/ }).click()
    })
    await expect(page).toHaveURL(/collections=.*jogos/)
    await expect(status).toHaveText('19 NFTs encontrados')
    // Longest jitter is 1.5 s: no late answer may replace the result after that.
    await page.waitForTimeout(1600)
    await expect(status).toHaveText('19 NFTs encontrados')
  })

  test('resultado vazio oferece limpar filtros', async ({ page }) => {
    await openApp(page, '/')
    await page.getByRole('searchbox', { name: /Buscar NFTs/ }).fill('zzz-nada')
    await expect(page.getByTestId('catalog-empty')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.getByTestId('catalog-status')).toHaveText('239 NFTs encontrados')
  })
})
