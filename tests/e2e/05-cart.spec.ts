import { addToCartFromDetail, expect, isMobile, loginAs, mockControl, openApp, submitLogin, test, USERS, visibleTestId, waitForMocks } from './support/app'

test.describe('05 · carrinho', () => {
  test('quantidades, remoção, cupom e persistência após refresh e login', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await addToCartFromDetail(page, 'sage-nomad-009')

    const lines = visibleTestId(page, 'cart-line')
    await expect(lines).toHaveCount(2)
    const total = page.getByTestId('quote-total')
    await expect(total).toHaveText('2.892 ETH') // 1.19 + 1.69 + fee 0.012

    await lines.filter({ hasText: 'Emerald Ape #042' }).getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(total).toHaveText('4.082 ETH')
    await lines.filter({ hasText: 'Sage Nomad #009' }).getByRole('button', { name: /Remover Sage Nomad/ }).click()
    await expect(lines).toHaveCount(1)
    await expect(total).toHaveText('2.388 ETH')

    const coupon = page.getByRole('textbox', { name: 'Código promocional' }).filter({ visible: true })
    const apply = page.getByRole('button', { name: 'Aplicar' }).filter({ visible: true })
    await coupon.fill('EXPIRADO5')
    await apply.click()
    await expect(page.getByText('Este código promocional expirou')).toBeVisible()
    await coupon.fill('NAOEXISTE')
    await apply.click()
    await expect(page.getByText('Código promocional inválido')).toBeVisible()
    await coupon.fill('kurio10')
    await apply.click()
    await expect(page.getByTestId('quote-discount')).toHaveText('(-) 0.238 ETH')
    await expect(total).toHaveText('2.15 ETH')

    await page.reload()
    await waitForMocks(page)
    await expect(lines).toHaveCount(1)
    await expect(total).toHaveText('2.15 ETH')

    // The visitor's cart (with the coupon) moves into the account at login.
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByTestId('quote-total')).toHaveText('2.15 ETH')
  })

  test('quantidade acima do estoque restante pode ser reduzida passo a passo', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    const stepper = page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).filter({ visible: true })
    await stepper.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await stepper.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(stepper.locator('output')).toHaveText('3')
    await page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true }).click()
    await expect(page).toHaveURL(/\/cart$/)

    // Stock drops to 1 while the collector holds 3: stepping down must work.
    await mockControl(page, '/nfts/emerald-ape-042', { available: 1 })
    const line = visibleTestId(page, 'cart-line')
    await expect(line.getByTestId('line-status')).toHaveText('Só resta 1')
    const quantity = line.getByRole('group').locator('output')
    await line.getByRole('button', { name: 'Diminuir quantidade' }).click()
    await expect(quantity).toHaveText('2')
    await line.getByRole('button', { name: 'Diminuir quantidade' }).click()
    await expect(quantity).toHaveText('1')
    await expect(line.getByTestId('line-status')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Conectar e finalizar' })).toBeVisible()
  })

  test('carrinho cabe em 320 px, sem rolagem lateral', async ({ page }) => {
    test.skip(!isMobile(page), 'Celular pequeno a partir do projeto mobile')
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await page.setViewportSize({ width: 320, height: 720 })
    await expect(visibleTestId(page, 'cart-line')).toHaveCount(1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('o total do carrinho é o mesmo do pagamento, na rede da carteira principal', async ({ page }) => {
    // Bruno's primary wallet is on Polygon, and his seeded cart has one item.
    await openApp(page, '/')
    await loginAs(page, USERS.bruno, '/cart')
    const total = page.getByTestId('quote-total').filter({ visible: true })
    await expect(total).toHaveText(/ETH$/)
    const inCart = await total.textContent()
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByTestId('quote-total').filter({ visible: true })).toHaveText(inCart!)
  })
})
