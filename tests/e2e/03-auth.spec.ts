import { expect, isMobile, mockControl, openApp, submitLogin, test, USERS, waitForMocks } from './support/app'

test.describe('03 · conta e sessão', () => {
  test('cadastro com conflito e sucesso', async ({ page }) => {
    await openApp(page, '/signup')
    const fill = async (username: string, email: string) => {
      await page.getByLabel('Nome de usuário', { exact: true }).fill(username)
      await page.getByLabel('E-mail', { exact: true }).fill(email)
      await page.getByLabel('Senha', { exact: true }).fill('kurio2026')
      await page.getByLabel('Confirmar senha', { exact: true }).fill('kurio2026')
      await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    }

    await fill('ana.nova', USERS.ana.email)
    const email = page.getByLabel('E-mail', { exact: true })
    await expect(page.getByText('Este e-mail já está cadastrado. Entre ou use outro e-mail.')).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')

    await fill('novo.colecionador', 'novo@kurio.test')
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/profile')
    await waitForMocks(page)
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('novo.colecionador')
  })

  test('validação do formulário de login e credenciais erradas', async ({ page }) => {
    await openApp(page, '/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('E-mail é obrigatório')).toBeVisible()
    await page.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada1')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos' })).toBeVisible()
  })

  test('expiração durante a navegação, logout e troca de usuário sem vazar dados', async ({ page }) => {
    await openApp(page, '/login?redirect=%2Fprofile')
    await submitLogin(page, USERS.ana)
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(USERS.ana.name)

    // The session expires while browsing: the next private request sends the user to login and back.
    await mockControl(page, '/session/expire')
    await page.getByRole('link', { name: 'Carteiras' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=.*wallets.*reason=expired/)
    // Announced twice on purpose: toast for sighted users, notice above the form.
    await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.').first()).toBeVisible()
    await submitLogin(page, USERS.ana)
    await expect(page).toHaveURL(/\/wallets$/)

    // Logout clears private data; Bruno never sees Ana's profile or cart.
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
    await submitLogin(page, USERS.bruno)
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(USERS.bruno.name)
    if (!isMobile(page)) await expect(page.getByRole('link', { name: /^Carrinho, 1 item$/ })).toBeVisible()
    const cached = await page.evaluate(() => localStorage.getItem('kurio:session'))
    expect(cached).toContain('usr_bruno')
  })
})
