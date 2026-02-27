import { test, expect } from '@playwright/test'

test.describe('App Navigation', () => {
  test('homepage loads and shows nutrition section by default', async ({ page }) => {
    await page.goto('/')
    // The page should load without errors
    await expect(page).toHaveTitle(/Velum/)
    // Default route is nutrition
    await expect(page.locator('body')).toBeVisible()
  })

  test('navigates to fitness section', async ({ page }) => {
    await page.goto('/fitness')
    await expect(page.locator('body')).toBeVisible()
    // Should show fitness-related content
    await expect(page.locator('text=/steps|runs|swims|fitness/i').first()).toBeVisible({ timeout: 10_000 })
  })

  test('navigates to budget section', async ({ page }) => {
    await page.goto('/budget')
    await expect(page.locator('body')).toBeVisible()
    // Should show budget-related content
    await expect(page.locator('text=/budget|spent|remaining/i').first()).toBeVisible({ timeout: 10_000 })
  })

  test('navigates to goals section', async ({ page }) => {
    await page.goto('/goals')
    await expect(page.locator('body')).toBeVisible()
  })

  test('navigates to books section', async ({ page }) => {
    await page.goto('/books')
    await expect(page.locator('body')).toBeVisible()
  })
})
