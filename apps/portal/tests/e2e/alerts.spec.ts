import { test, expect } from '@playwright/test'
import type { Alert } from '../../lib/types'

/**
 * Alerts Page E2E tests
 * Tests table rendering, filtering, and sorting.
 */

const MOCK_ALERTS: Alert[] = [
  {
    id: 'a1',
    device_ip: '192.168.1.10',
    platform: 'youtube',
    content_id: 'vid001',
    title: 'Extreme Sports compilation 2026',
    risk_level: 'high',
    risk_categories: ['violence', 'stunts'],
    risk_confidence: 0.87,
    ai_provider: 'groq',
    dispatched_via: ['ntfy'],
    environment: 'dev',
    created_at: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: 'a2',
    device_ip: '192.168.1.20',
    platform: 'roblox',
    content_id: '1234567',
    title: 'Blox Fruits — 17+ dungeon',
    risk_level: 'critical',
    risk_categories: ['adult', 'violence'],
    risk_confidence: 0.95,
    ai_provider: 'anthropic',
    dispatched_via: ['ntfy', 'supabase'],
    environment: 'dev',
    created_at: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: 'a3',
    device_ip: '192.168.1.10',
    platform: 'twitch',
    content_id: 'streamer99',
    title: 'Late night gaming stream',
    risk_level: 'medium',
    risk_categories: ['gaming'],
    risk_confidence: 0.62,
    ai_provider: 'groq',
    dispatched_via: ['ntfy'],
    environment: 'dev',
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: 'a4',
    device_ip: '192.168.1.30',
    platform: 'youtube',
    content_id: 'vid002',
    title: 'Math tutorial for kids',
    risk_level: 'low',
    risk_categories: ['educational'],
    risk_confidence: 0.98,
    ai_provider: 'groq',
    dispatched_via: [],
    environment: 'dev',
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
  },
]

test.describe('Alerts Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase REST API returning our test alerts
    await page.route('**/rest/v1/alerts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ALERTS),
      })
    })
  })

  test('renders alert table with correct columns', async ({ page }) => {
    await page.goto('/alerts')
    await expect(page.getByTestId('alerts-page')).toBeVisible()
    await expect(page.getByTestId('alert-table')).toBeVisible()
  })

  test('shows filter controls', async ({ page }) => {
    await page.goto('/alerts')
    await expect(page.getByTestId('filter-risk')).toBeVisible()
    await expect(page.getByTestId('filter-platform')).toBeVisible()
  })

  test('filters by risk level — shows only critical alerts', async ({ page }) => {
    await page.goto('/alerts')

    await page.getByTestId('filter-risk').selectOption('critical')

    const rows = page.getByTestId('alert-row')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toHaveAttribute('data-risk', 'critical')
  })

  test('filters by platform — shows only youtube alerts', async ({ page }) => {
    await page.goto('/alerts')

    await page.getByTestId('filter-platform').selectOption('youtube')

    const rows = page.getByTestId('alert-row')
    // 2 youtube alerts in mock data
    await expect(rows).toHaveCount(2)
  })

  test('combined risk + platform filter narrows results', async ({ page }) => {
    await page.goto('/alerts')

    await page.getByTestId('filter-risk').selectOption('high')
    await page.getByTestId('filter-platform').selectOption('youtube')

    const rows = page.getByTestId('alert-row')
    await expect(rows).toHaveCount(1)
  })

  test('clear filters button restores all rows', async ({ page }) => {
    await page.goto('/alerts')

    await page.getByTestId('filter-risk').selectOption('critical')
    // Only 1 row now
    await expect(page.getByTestId('alert-row')).toHaveCount(1)

    await page.getByRole('button', { name: 'Clear filters' }).click()
    // All rows restored
    await expect(page.getByTestId('alert-row')).toHaveCount(MOCK_ALERTS.length)
  })

  test('risk badges render correct level labels', async ({ page }) => {
    await page.goto('/alerts')

    const criticalBadges = page.getByTestId('risk-badge').filter({ hasText: 'critical' })
    await expect(criticalBadges.first()).toBeVisible()
  })

  test('device URL parameter pre-filters table', async ({ page }) => {
    await page.goto('/alerts?device=192.168.1.10')
    // Two alerts from 192.168.1.10 in mock data
    const rows = page.getByTestId('alert-row')
    await expect(rows).toHaveCount(2)
  })

  test('sorts by risk level when column header clicked', async ({ page }) => {
    await page.goto('/alerts')

    await page.getByRole('columnheader', { name: /risk/i }).click()

    // After sort, first row should be lowest risk (asc sort = low first)
    const firstRow = page.getByTestId('alert-row').first()
    await expect(firstRow).toHaveAttribute('data-risk', 'low')
  })
})
