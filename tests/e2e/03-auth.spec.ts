import { addToCartFromDetail, expect, isMobile, loginAs, mockControl, openApp, submitLogin, test, USERS, waitForMocks } from './support/app'

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

  test('o login pedido pelo carrinho abre sobre o carrinho e fecha nele', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await expect(dialog).toContainText('Entre para finalizar a compra.')
    // The /login route would show the home page behind the modal.
    await expect(page).toHaveURL(/\/cart$/)
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByTestId('cart-line').filter({ visible: true })).toHaveCount(1)
  })

  test('Entrar no header abre o login sobre a página atual e fica nela', async ({ page }) => {
    test.skip(isMobile(page), 'No mobile não há header; a aba Perfil leva à tela cheia de login')
    await openApp(page, '/nft/emerald-ape-042')
    await page.getByRole('link', { name: 'Entrar', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await expect(dialog).toContainText('Entre para gerenciar sua carteira')
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
    await submitLogin(page)
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
    await expect(page.getByRole('link', { name: USERS.ana.name })).toBeVisible()
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

  test('a sessão expira sozinha depois de 30 minutos', async ({ page }) => {
    await page.clock.install()
    await openApp(page, '/')
    await loginAs(page, USERS.ana, '/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(USERS.ana.name)
    // The mock server's sessions last 30 minutes; the fake clock gets there without waiting.
    await page.clock.fastForward('30:05')
    await page.getByRole('link', { name: 'Carteiras' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=.*reason=expired/)
    await submitLogin(page, USERS.ana)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('sessão expira no pagamento: depois do login, volta ao pagamento com o que estava preenchido', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)
    await page.getByRole('radio', { name: /Coinbase/ }).check()

    await mockControl(page, '/session/expire')
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=.*checkout.*reason=expired/)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)
    // The draft brought back what was chosen before the session expired.
    await expect(page.getByRole('radio', { name: /Coinbase/ })).toBeChecked()
  })

  test('sair apaga o rascunho do pagamento deste navegador', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)
    await page.getByRole('radio', { name: /Coinbase/ }).check()
    const drafts = () => page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith('kurio:checkout-draft')))
    await expect.poll(drafts).toHaveLength(1)

    await page.goto('/profile')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    expect(await drafts()).toEqual([])
  })
})
