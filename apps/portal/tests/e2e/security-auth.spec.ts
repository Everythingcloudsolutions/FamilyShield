import { test, expect } from '@playwright/test'

/**
 * Security auth-path tests.
 *
 * These tests are opt-in and run only when:
 * - PLAYWRIGHT_TEST_AUTH_ENABLED=true
 * - The running portal server has PORTAL_BASIC_AUTH_ENABLED=true
 *
 * Example:
 * PLAYWRIGHT_TEST_AUTH_ENABLED=true \
 * PORTAL_BASIC_AUTH_ENABLED=true \
 * PORTAL_BASIC_AUTH_USERNAME=parent \
 * PORTAL_BASIC_AUTH_PASSWORD=changeme \
 * npm run test:e2e
 */

test.describe('Security: Unauthenticated route protection', () => {
  test.skip(process.env.PLAYWRIGHT_TEST_AUTH_ENABLED !== 'true', 'Enable with PLAYWRIGHT_TEST_AUTH_ENABLED=true')

  test('rejects unauthenticated access to protected page', async ({ page }) => {
    const response = await page.goto('/alerts')
    expect(response?.status()).toBe(401)
  })

  test('allows authenticated access to protected page', async ({ browser }) => {
    const username = process.env.PLAYWRIGHT_TEST_AUTH_USER ?? 'parent'
    const password = process.env.PLAYWRIGHT_TEST_AUTH_PASS ?? 'changeme'
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

    const context = await browser.newContext({
      extraHTTPHeaders: {
        Authorization: authHeader,
      },
    })

    const page = await context.newPage()
    const response = await page.goto('/alerts')

    expect(response?.status()).toBeLessThan(500)
    await expect(page.getByTestId('alerts-page')).toBeVisible()

    await context.close()
  })
})
