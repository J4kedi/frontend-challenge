import { addToCartFromDetail, expect, openApp, submitLogin, test, visibleTestId, waitForMocks } from './support/app'

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
})
