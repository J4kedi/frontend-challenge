import { expect, openApp, test } from './support/app'

test('home loads the catalog from the mocked API', async ({ page }) => {
  await openApp(page, '/')
  await expect(page).toHaveTitle(/Kurio/)
  await expect(page.locator('main')).toBeVisible()
})
