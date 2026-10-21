import AxeBuilder from '@axe-core/playwright'
import { addToCartFromDetail, expect, openApp, test, USERS } from './support/app'

test.describe('15 · painel de mocks', () => {
  test('cada ação diz o que vai fazer, com os dados atuais', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const trigger = page.getByRole('button', { name: /^Mocks · / })
    await trigger.click()
    const panel = page.getByRole('region', { name: 'Painel de mocks' })
    await expect(panel).toBeFocused()

    // No event published yet: replaying is disabled and the description says why.
    const replay = panel.getByRole('button', { name: /^Reenviar o último evento/ })
    await expect(replay).toBeDisabled()

    // Labels name the item they act on; the result comes back as a toast.
    await panel.getByRole('button', { name: 'Subir o preço de Emerald Ape #042 para 1.29 ETH' }).click()
    await expect(page.getByText('Emerald Ape #042: 1.19 → 1.29 ETH. O servidor publicou nft.updated.')).toBeVisible()
    await expect(replay).toBeEnabled()
    await expect(replay).toHaveAccessibleName(/nft\.updated · Emerald Ape #042 · v\d+/)

    const results = await new AxeBuilder({ page }).include('[data-mock-panel]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => v.id)).toEqual([])

    // Escape closes the panel and gives focus back to its button.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('queda com duração escolhida e login rápido', async ({ page }) => {
    await openApp(page, '/')
    await page.getByRole('button', { name: /^Mocks · / }).click()
    const panel = page.getByRole('region', { name: 'Painel de mocks' })

    // The outage lasts what was chosen, not the ~0.5 s of an automatic reconnection.
    await panel.getByLabel('Duração da queda').selectOption('5')
    await panel.getByRole('button', { name: 'Derrubar a conexão por 5 s' }).click()
    const offline = page.getByText('Conexão em tempo real perdida')
    await expect(offline).toBeVisible()
    // Seconds pass on the countdown and the outage holds.
    await expect(panel.getByText(/o servidor volta em [1-2] s/)).toBeVisible({ timeout: 10_000 })
    await expect(offline).toBeVisible()
    await expect(offline).toBeHidden({ timeout: 10_000 })
    await expect(page.getByText('Conexão em tempo real restabelecida')).toBeVisible()

    await panel.getByRole('button', { name: new RegExp(`^Entrar como ${USERS.bruno.name}`) }).click()
    await expect(panel.getByText(`${USERS.bruno.name} · ${USERS.bruno.email}`)).toBeVisible()
    await expect(panel.getByRole('button', { name: new RegExp(`^Entrar como ${USERS.ana.name}`) })).toBeVisible()
  })

  test('reset volta também ao cenário padrão', async ({ page }) => {
    await openApp(page, '/', 'slow')
    await page.goto('/?mock-reset')
    await expect(page.locator('html[data-mocks="ready"]')).toBeAttached()
    const state = await page.evaluate(() => fetch('/api/__mock/state').then((r) => r.json() as Promise<{ scenario: string }>))
    expect(state.scenario).toBe('default')
  })
})
