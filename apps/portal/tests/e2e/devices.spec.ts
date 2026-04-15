import { test, expect } from '@playwright/test'
import type { Device } from '../../lib/types'

/**
 * Devices Page E2E tests
 * Tests device card rendering, enrollment flow, and form validation.
 */

const MOCK_DEVICES: Device[] = [
  {
    device_ip: '192.168.1.50',
    device_name: "Emma's iPad",
    profile: 'strict',
    enrolled_at: new Date(Date.now() - 86_400_000).toISOString(),
    last_seen: new Date(Date.now() - 300_000).toISOString(),
  },
  {
    device_ip: '192.168.1.51',
    device_name: "Noah's Laptop",
    profile: 'moderate',
    enrolled_at: new Date(Date.now() - 172_800_000).toISOString(),
    last_seen: new Date(Date.now() - 60_000).toISOString(),
  },
]

test.describe('Devices Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/rest/v1/devices*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DEVICES),
        })
      } else if (method === 'POST') {
        // Mock successful INSERT
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else {
        await route.continue()
      }
    })
  })

  test('renders devices page heading', async ({ page }) => {
    await page.goto('/devices')
    await expect(page.getByTestId('devices-page')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Devices' })).toBeVisible()
  })

  test('shows enrol device button', async ({ page }) => {
    await page.goto('/devices')
    await expect(page.getByTestId('open-enrol-modal')).toBeVisible()
  })

  test('opens enrollment modal on button click', async ({ page }) => {
    await page.goto('/devices')

    await page.getByTestId('open-enrol-modal').click()

    await expect(page.getByTestId('enrol-modal')).toBeVisible()
    await expect(page.getByTestId('input-device-name')).toBeVisible()
    await expect(page.getByTestId('input-device-ip')).toBeVisible()
  })

  test('closes modal when clicking backdrop', async ({ page }) => {
    await page.goto('/devices')

    await page.getByTestId('open-enrol-modal').click()
    await expect(page.getByTestId('enrol-modal')).toBeVisible()

    // Click outside modal (backdrop area)
    await page.mouse.click(10, 10)

    await expect(page.getByTestId('enrol-modal')).not.toBeVisible()
  })

  test('shows validation error for invalid IP address', async ({ page }) => {
    await page.goto('/devices')

    await page.getByTestId('open-enrol-modal').click()
    await page.getByTestId('input-device-name').fill("Test Device")
    await page.getByTestId('input-device-ip').fill('not-an-ip')

    await page.getByTestId('submit-enrol').click()

    await expect(page.getByTestId('enrol-error')).toBeVisible()
    await expect(page.getByTestId('enrol-error')).toContainText('valid IPv4')
  })

  test('successfully enrolls a device with valid data', async ({ page }) => {
    await page.goto('/devices')

    await page.getByTestId('open-enrol-modal').click()
    await page.getByTestId('input-device-name').fill("Liam's Phone")
    await page.getByTestId('input-device-ip').fill('192.168.1.100')

    // Select guided profile
    await page.getByTestId('profile-option-guided').click()

    await page.getByTestId('submit-enrol').click()

    // Modal should close on success
    await expect(page.getByTestId('enrol-modal')).not.toBeVisible()

    // New device should appear in the list
    await expect(page.getByTestId('devices-grid')).toContainText("Liam's Phone")
  })

  test('all three age profiles are selectable', async ({ page }) => {
    await page.goto('/devices')

    await page.getByTestId('open-enrol-modal').click()

    await expect(page.getByTestId('profile-option-strict')).toBeVisible()
    await expect(page.getByTestId('profile-option-moderate')).toBeVisible()
    await expect(page.getByTestId('profile-option-guided')).toBeVisible()
  })

  test('device card shows device name and IP', async ({ page }) => {
    // The devices page is client-side, start with empty state then enrol
    await page.goto('/devices')

    // Enrol a device to see the card
    await page.getByTestId('open-enrol-modal').click()
    await page.getByTestId('input-device-name').fill("Test Device")
    await page.getByTestId('input-device-ip').fill('10.0.0.5')
    await page.getByTestId('submit-enrol').click()

    const card = page.getByTestId('device-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('device-name')).toContainText('Test Device')
    await expect(card.getByTestId('device-ip')).toContainText('10.0.0.5')
  })

  test('device card links to filtered alerts page', async ({ page }) => {
    await page.goto('/devices')

    // Enrol a device first
    await page.getByTestId('open-enrol-modal').click()
    await page.getByTestId('input-device-name').fill('Device A')
    await page.getByTestId('input-device-ip').fill('192.168.1.77')
    await page.getByTestId('submit-enrol').click()

    // Check alerts link
    const alertsLink = page.getByTestId('device-alerts-link').first()
    await expect(alertsLink).toHaveAttribute('href', '/alerts?device=192.168.1.77')
  })
})
