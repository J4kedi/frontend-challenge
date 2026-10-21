import { addToCartFromDetail, expect, goToReview, mockControl, openApp, ordersOf, test, visibleTestId } from './support/app'

test.describe('07 · falhas de pagamento', () => {
  test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
    await openApp(page, '/', 'payment-declined')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const review = await goToReview(page)
    await review.getByTestId('confirm-purchase').click()

    await expect(page.getByTestId('order-declined')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Pagamento recusado pela rede simulada/)).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(visibleTestId(page, 'cart-line')).toHaveCount(1)
  })

  test('clique repetido cria um único pedido', async ({ page }) => {
    await openApp(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const review = await goToReview(page)
    await review.getByTestId('confirm-purchase').dblclick()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    expect(await ordersOf(page)).toHaveLength(1)
  })

  test('timeout depois da criação recupera o mesmo pedido pela chave de idempotência', async ({ page }) => {
    test.setTimeout(90_000)
    await openApp(page, '/', 'order-timeout')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const review = await goToReview(page)
    await review.getByTestId('confirm-purchase').click()
    // The first POST answers after the client's 8 s timeout; the retry reuses the key.
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 30_000 })
    const orders = await ordersOf(page)
    expect(orders).toHaveLength(1)
    expect(orders[0]!.status).toBe('confirmed')
  })

  test('mesma chave com conteúdo diferente gera conflito', async ({ page }) => {
    await openApp(page, '/')
    const statuses = await page.evaluate(async () => {
      const login = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ana@kurio.test', password: 'kurio2026' }),
      }).then((r) => r.json() as Promise<{ token: string }>)
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` }
      await fetch('/api/cart/items', { method: 'POST', headers, body: JSON.stringify({ nftId: 'emerald-ape-042', editionId: 'emerald-ape-042:1-50', quantity: 1 }) })
      await fetch('/api/me/wallets/wal_ana_primary/connect', { method: 'POST', headers, body: JSON.stringify({ provider: 'metamask', network: 'ethereum' }) })
      const quote = await fetch('/api/cart/quote?network=ethereum', { headers }).then((r) => r.json() as Promise<{ id: string }>)
      const buyer = { displayName: 'Ana', username: 'ana.coleciona', profileName: 'Ana', email: 'ana@kurio.test', ensName: 'anacoleciona', referralCode: 'KURIO-ANA' }
      const body = { quoteId: quote.id, network: 'ethereum', walletId: 'wal_ana_primary', provider: 'metamask', buyer }
      const send = (b: unknown) =>
        fetch('/api/orders', { method: 'POST', headers: { ...headers, 'Idempotency-Key': 'test-key-123456' }, body: JSON.stringify(b) }).then((r) => r.status)
      return [await send(body), await send(body), await send({ ...body, buyer: { ...buyer, profileName: 'Outra' } })]
    })
    expect(statuses).toEqual([201, 200, 409])
  })

  test('a carteira só conecta numa rede do seu tipo de endereço', async ({ page }) => {
    await openApp(page, '/')
    const result = await page.evaluate(async () => {
      const login = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ana@kurio.test', password: 'kurio2026' }),
      }).then((r) => r.json() as Promise<{ token: string }>)
      // Ana's primary wallet has an EVM (0x…) address.
      const response = await fetch('/api/me/wallets/wal_ana_primary/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` },
        body: JSON.stringify({ provider: 'metamask', network: 'solana' }),
      })
      return [response.status, ((await response.json()) as { error?: { code: string } }).error?.code]
    })
    expect(result).toEqual([422, 'VALIDATION_ERROR'])
  })

  test('com um pedido em processamento, outra compra do mesmo carrinho é recusada', async ({ page }) => {
    await openApp(page, '/')
    const result = await page.evaluate(async () => {
      const login = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ana@kurio.test', password: 'kurio2026' }),
      }).then((r) => r.json() as Promise<{ token: string }>)
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` }
      await fetch('/api/cart/items', { method: 'POST', headers, body: JSON.stringify({ nftId: 'emerald-ape-042', editionId: 'emerald-ape-042:1-50', quantity: 1 }) })
      await fetch('/api/me/wallets/wal_ana_primary/connect', { method: 'POST', headers, body: JSON.stringify({ provider: 'metamask', network: 'ethereum' }) })
      const buyer = { displayName: 'Ana', username: 'ana.coleciona', profileName: 'Ana', email: 'ana@kurio.test', ensName: 'anacoleciona', referralCode: 'KURIO-ANA' }
      // Each attempt takes a fresh quote and its own key, as checkout does after going back.
      const order = async (key: string) => {
        const quote = await fetch('/api/cart/quote?network=ethereum', { headers }).then((r) => r.json() as Promise<{ id: string }>)
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { ...headers, 'Idempotency-Key': key },
          body: JSON.stringify({ quoteId: quote.id, network: 'ethereum', walletId: 'wal_ana_primary', provider: 'metamask', buyer }),
        })
        return { status: response.status, body: (await response.json()) as { error?: { code: string } } }
      }
      const first = await order('first-attempt-123')
      const second = await order('second-attempt-456')
      return [first.status, second.status, second.body.error?.code]
    })
    expect(result).toEqual([201, 409, 'ORDER_IN_PROGRESS'])
  })

  test('tentar de novo depois do pagamento recusado cria outro pedido', async ({ page }) => {
    await openApp(page, '/', 'payment-declined')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const review = await goToReview(page)
    await review.getByTestId('confirm-purchase').click()
    await expect(page.getByTestId('order-declined')).toBeVisible({ timeout: 15_000 })
    const declinedUrl = page.url()

    // Same cart, same quote: the declined attempt must not be replayed.
    await mockControl(page, '/scenario', { name: 'default' }, 'PUT')
    await page.getByRole('link', { name: 'Tentar novamente' }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    const connection = page.getByTestId('wallet-connection')
    if (!(await connection.textContent())?.includes('conectada')) {
      await page.getByRole('button', { name: 'Conectar carteira' }).click()
      await expect(connection).toContainText('conectada')
    }
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.getByRole('dialog', { name: 'Revise sua compra' }).getByTestId('confirm-purchase').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    expect(page.url()).not.toBe(declinedUrl)
    expect((await ordersOf(page)).map((o) => o.status).sort()).toEqual(['confirmed', 'declined'])
  })
})
