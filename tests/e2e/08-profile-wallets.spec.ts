import { expect, openApp, submitLogin, test, waitForMocks } from './support/app'

// 1×1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

test.describe('08 · perfil e carteiras', () => {
  test('edita perfil, avatar e senha com validação', async ({ page }) => {
    await openApp(page, '/login?redirect=%2Fprofile')
    await submitLogin(page)
    await expect(page).toHaveURL(/\/profile$/)

    await page.getByLabel('Nome de usuário').fill('Ana!')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Use 3 a 20 letras minúsculas, números, ponto ou _')).toBeVisible()
    await expect(page.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Nome de usuário').fill('ana.coleciona')
    await page.getByLabel('Nome de exibição').fill('Ana C.')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Perfil atualizado.').first()).toBeVisible()
    await page.reload()
    await waitForMocks(page)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana C.')

    await page.locator('input[type="file"]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('img', { name: 'Avatar de Ana C.' })).toBeVisible()

    await page.getByLabel('Nome de exibição').fill('Ana Errada')
    await page.getByLabel('Senha atual').fill('errada123')
    await page.getByLabel('Nova senha', { exact: true }).fill('novaSenha1')
    await page.getByLabel('Confirmar nova senha').fill('novaSenha1')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByLabel('Senha atual')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Senha atual incorreta')).toBeVisible()
    // The password is checked first: nothing of the form was saved.
    const savedName = await page.evaluate(async () => {
      const { token } = JSON.parse(localStorage.getItem('kurio:session') ?? '{}') as { token?: string }
      return ((await fetch('/api/me/profile', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())) as { displayName: string }).displayName
    })
    expect(savedName).toBe('Ana C.')

    await page.getByLabel('Senha atual').fill('kurio2026')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Perfil e senha atualizados.').first()).toBeVisible()
  })

  test('cadastra e edita carteiras principal e secundária', async ({ page }) => {
    await openApp(page, '/login?redirect=%2Fwallets')
    await submitLogin(page)
    await expect(page).toHaveURL(/\/wallets$/)

    const primary = page.getByRole('form', { name: 'Carteira principal' })
    await primary.getByLabel('Endereço da carteira').fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText('Endereço inválido: use 0x + 40 caracteres hexadecimais')).toBeVisible()
    await primary.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.').first()).toBeVisible()

    await page.getByLabel('Igual à carteira principal').check()
    await page.getByRole('button', { name: 'Adicionar' }).click()
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await expect(secondary.getByLabel('Endereço da carteira')).toHaveValue('0x1111111111111111111111111111111111111111')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.').first()).toBeVisible()
    await page.reload()
    await waitForMocks(page)
    await expect(page.getByRole('form', { name: 'Carteira secundária' })).toBeVisible()
  })
})
