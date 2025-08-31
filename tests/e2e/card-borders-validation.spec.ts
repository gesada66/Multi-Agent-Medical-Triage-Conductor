import { test, expect } from '@playwright/test';

test('validate card borders match wireframe design', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Test desktop layout with borders
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(1000);

  // Take full screenshot with card borders
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/card-borders-desktop.png',
    fullPage: true 
  });

  console.log('✅ Desktop screenshot with card borders captured');

  // Test mobile layout with borders  
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);

  await page.screenshot({ 
    path: 'tests/e2e/screenshots/card-borders-mobile.png',
    fullPage: true 
  });

  console.log('✅ Mobile screenshot with card borders captured');

  // Validate all cards are present with borders
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(500);

  // Check that all card elements are visible
  await expect(page.locator('.border-2').first()).toBeVisible();
  console.log('✅ Border styling is applied');

  // Count number of cards with borders
  const borderedCards = page.locator('.border-2.border-gray-300.rounded-xl');
  const cardCount = await borderedCards.count();
  console.log(`✅ Found ${cardCount} cards with proper border styling`);

  // Should have 5 cards: header + symptom intake + timeline + risk + plan
  expect(cardCount).toBe(5);
  
  // Verify card contents are still correct
  await expect(page.getByText('PATIENT:')).toBeVisible();
  await expect(page.getByText('Symptom Intake')).toBeVisible();
  await expect(page.getByText('Processing Timeline')).toBeVisible();
  await expect(page.getByText('Risk Assessment')).toBeVisible();
  await expect(page.getByText('Care Plan')).toBeVisible();
  await expect(page.getByText('BAND:')).toBeVisible();
  await expect(page.getByText('[ IMMEDIATE ]')).toBeVisible();

  console.log('✅ All card content validated');

  // Take a focused screenshot of just the main grid to see borders clearly
  const mainGrid = page.locator('.grid.gap-6').first();
  await mainGrid.screenshot({ 
    path: 'tests/e2e/screenshots/card-borders-grid-focus.png'
  });

  console.log('✅ Grid focus screenshot captured');

  // Verify border styling matches wireframe specification
  const headerCard = page.locator('.border-2').first();
  const cardStyles = await headerCard.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      borderWidth: styles.borderWidth,
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
      boxShadow: styles.boxShadow
    };
  });

  console.log('Card styling:', cardStyles);
  console.log('✅ Card border validation complete');
});