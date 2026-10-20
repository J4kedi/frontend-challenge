import AxeBuilder from '@axe-core/playwright'
import { addToCartFromDetail, expect, isMobile, openApp, test } from './support/app'

async function expectNoSeriousViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).exclude('[data-mock-panel]').analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
}

test.describe('11 · acessibilidade', () => {
  test('pular para o conteúdo e navegação por teclado', async ({ page }) => {
    await openApp(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('diálogo de login prende o foco e fecha com Esc', async ({ page }) => {
    test.skip(isMobile(page), 'Login is a full page on mobile (Figma)')
    await openApp(page, '/login')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$/)
  })

  test('erros de formulário ficam ligados aos campos', async ({ page }) => {
    await openApp(page, '/signup')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    const username = page.getByLabel('Nome de usuário', { exact: true })
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await username.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`[id="${describedBy!.split(' ')[0]}"]`)).toContainText('Nome de usuário é obrigatório')
  })

  for (const path of ['/', '/nft/emerald-ape-042', '/login']) {
    test(`axe sem violações sérias em ${path}`, async ({ page }) => {
      await openApp(page, path)
      await page.waitForLoadState('networkidle')
      await expectNoSeriousViolations(page)
    })
  }

  test('axe sem violações sérias no carrinho', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await expect(page.getByTestId('quote-total')).toBeVisible()
    await expectNoSeriousViolations(page)
  })
})
